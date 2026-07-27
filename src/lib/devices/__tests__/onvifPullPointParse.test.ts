import { describe, it, expect } from 'vitest';
import {
  parseSubscribeResponse,
  parsePullMessages,
  leaseFromDeviceClocks,
  classifySoapFailure,
  isDeadSubscriptionFault,
} from '../onvifPullPointParse';

/**
 * As amostras abaixo imitam respostas de campo, incluindo os defeitos que
 * derrubam parser estrito: prefixos diferentes, atributos fora de ordem e
 * entidades escapadas dentro de valores.
 */

const SUBSCRIBE_OK = `<?xml version="1.0"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://www.w3.org/2003/05/soap-envelope">
 <SOAP-ENV:Body>
  <tev:CreatePullPointSubscriptionResponse xmlns:tev="http://www.onvif.org/ver10/events/wsdl">
   <tev:SubscriptionReference>
    <wsa:Address xmlns:wsa="http://www.w3.org/2005/08/addressing">http://10.0.0.9/onvif/Subscription?Idx=7</wsa:Address>
   </tev:SubscriptionReference>
   <wsnt:CurrentTime xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">2026-07-27T10:00:00Z</wsnt:CurrentTime>
   <wsnt:TerminationTime xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">2026-07-27T10:05:00Z</wsnt:TerminationTime>
  </tev:CreatePullPointSubscriptionResponse>
 </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

describe('parseSubscribeResponse', () => {
  it('extrai endereço e carimbos independentemente do prefixo', () => {
    const parsed = parseSubscribeResponse(SUBSCRIBE_OK);
    expect(parsed.address).toBe('http://10.0.0.9/onvif/Subscription?Idx=7');
    expect(parsed.currentTime).toBe('2026-07-27T10:00:00Z');
    expect(parsed.terminationTime).toBe('2026-07-27T10:05:00Z');
  });

  it('é total diante de lixo', () => {
    for (const bad of ['', '<html>500</html>', 'não é xml']) {
      expect(parseSubscribeResponse(bad).address).toBeNull();
    }
  });
});

describe('leaseFromDeviceClocks', () => {
  it('mede o empréstimo pela diferença, imune a relógio adiantado', () => {
    // Câmera 3 horas adiantada: os absolutos mentem, a diferença não.
    const lease = leaseFromDeviceClocks('2026-07-27T13:00:00Z', '2026-07-27T13:05:00Z');
    expect(lease).toBe(300_000);
  });

  it('recusa diferença não positiva ou carimbo ilegível', () => {
    expect(leaseFromDeviceClocks('2026-07-27T10:05:00Z', '2026-07-27T10:00:00Z')).toBeNull();
    expect(leaseFromDeviceClocks('ontem', 'amanhã')).toBeNull();
    expect(leaseFromDeviceClocks(null, '2026-07-27T10:05:00Z')).toBeNull();
  });
});

const PULL_OK = `<tev:PullMessagesResponse xmlns:tev="http://www.onvif.org/ver10/events/wsdl">
 <wsnt:NotificationMessage xmlns:wsnt="http://docs.oasis-open.org/wsn/b-2">
  <wsnt:Topic Dialect="...ConcreteSet">tns1:Device/Trigger/DigitalInput</wsnt:Topic>
  <wsnt:Message>
   <tt:Message UtcTime="2026-07-27T10:01:02Z" PropertyOperation="Changed" xmlns:tt="http://www.onvif.org/ver10/schema">
    <tt:Source><tt:SimpleItem Name="InputToken" Value="DI_1"/></tt:Source>
    <tt:Data><tt:SimpleItem Name="LogicalState" Value="true"/></tt:Data>
   </tt:Message>
  </wsnt:Message>
 </wsnt:NotificationMessage>
 <NotificationMessage>
  <Topic>tns1:VideoSource/MotionAlarm</Topic>
  <Message>
   <Message PropertyOperation="Initialized" UtcTime="2026-07-27T10:01:03Z">
    <Source><SimpleItem Value="VS_0" Name="VideoSourceConfigurationToken"/></Source>
    <Data><SimpleItem Name="State" Value="R&amp;D"/></Data>
   </Message>
  </Message>
 </NotificationMessage>
</tev:PullMessagesResponse>`;

describe('parsePullMessages', () => {
  it('lê múltiplos eventos com prefixos distintos e atributos fora de ordem', () => {
    const events = parsePullMessages(PULL_OK);
    expect(events).toHaveLength(2);

    expect(events[0]).toMatchObject({
      topic: 'tns1:Device/Trigger/DigitalInput',
      sourceToken: 'DI_1',
      utcTime: '2026-07-27T10:01:02Z',
      propertyOperation: 'Changed',
    });
    expect(events[0]?.data).toEqual({ LogicalState: 'true' });

    expect(events[1]?.sourceToken).toBe('VS_0');
    // Entidade decodificada: o valor bruto viria com &amp;.
    expect(events[1]?.data).toEqual({ State: 'R&D' });
  });

  it('descarta evento sem instante do equipamento (sem chave de duplicidade)', () => {
    const xml = `<NotificationMessage><Topic>tns1:X</Topic><Message><Message PropertyOperation="Changed"/></Message></NotificationMessage>`;
    expect(parsePullMessages(xml)).toEqual([]);
  });

  it('descarta evento sem tópico e nunca lança', () => {
    expect(parsePullMessages('<NotificationMessage><Topic>  </Topic></NotificationMessage>')).toEqual([]);
    expect(parsePullMessages('')).toEqual([]);
    expect(parsePullMessages('<<<>>>')).toEqual([]);
  });

  it('ignora operação de propriedade desconhecida em vez de propagá-la', () => {
    const xml = `<NotificationMessage><Topic>tns1:X</Topic><Message>
      <Message UtcTime="2026-07-27T10:00:00Z" PropertyOperation="Frobnicated"/></Message></NotificationMessage>`;
    expect(parsePullMessages(xml)[0]?.propertyOperation).toBeNull();
  });
});

describe('classifySoapFailure', () => {
  it('separa transporte, autenticação, incapacidade e defeito', () => {
    expect(classifySoapFailure(0, 'AbortError')).toBe('transport');
    expect(classifySoapFailure(401, '')).toBe('auth');
    expect(classifySoapFailure(200, '<s:Fault><s:Subcode><s:Value>wsse:FailedAuthentication</s:Value>')).toBe('auth');
    expect(classifySoapFailure(200, '<s:Fault><s:Value>ter:ActionNotSupported</s:Value></s:Fault>')).toBe('unsupported');
    expect(classifySoapFailure(404, '')).toBe('unsupported');
    expect(classifySoapFailure(500, 'internal')).toBe('device_fault');
    expect(classifySoapFailure(200, '<s:Fault>algo</s:Fault>')).toBe('device_fault');
  });

  it('não trata erro genérico como permanente', () => {
    // Falso negativo mais caro: cegar a câmera para sempre por um 400 isolado.
    expect(classifySoapFailure(400, 'bad request')).toBe('device_fault');
    expect(classifySoapFailure(200, '<PullMessagesResponse/>')).toBe('none');
  });
});

describe('isDeadSubscriptionFault', () => {
  it('reconhece as várias formas de "essa assinatura não existe mais"', () => {
    for (const body of [
      '<s:Value>wsrf-rw:ResourceUnknownFault</s:Value>',
      'Subscription not found',
      'ter:UnacceptableTerminationTime',
    ]) {
      expect(isDeadSubscriptionFault(body)).toBe(true);
    }
    expect(isDeadSubscriptionFault('timeout')).toBe(false);
    expect(isDeadSubscriptionFault('')).toBe(false);
  });
});
