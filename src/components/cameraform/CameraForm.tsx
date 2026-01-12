import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Save, X } from 'lucide-react';

interface CameraFormData {
  name: string;
  ip: string;
  port: number;
  protocol: 'rtsp' | 'http' | 'onvif';
  username?: string;
  password?: string;
  location?: string;
}

interface CameraFormProps {
  initialData?: Partial<CameraFormData>;
  onSubmit: (data: CameraFormData) => void;
  onCancel?: () => void;
  className?: string;
}

export function CameraForm({ initialData, onSubmit, onCancel, className }: CameraFormProps) {
  const [data, setData] = useState<CameraFormData>({
    name: '', ip: '', port: 554, protocol: 'rtsp', username: '', password: '', location: '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Camera className="h-5 w-5" />
        <h3 className="font-medium">{initialData ? 'Editar' : 'Nova'} Câmera</h3>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium">Nome</label>
          <Input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} required />
        </div>
        <div>
          <label className="text-sm font-medium">IP</label>
          <Input value={data.ip} onChange={e => setData(d => ({ ...d, ip: e.target.value }))} required />
        </div>
        <div>
          <label className="text-sm font-medium">Porta</label>
          <Input type="number" value={data.port} onChange={e => setData(d => ({ ...d, port: parseInt(e.target.value) }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Protocolo</label>
          <select value={data.protocol} onChange={e => setData(d => ({ ...d, protocol: e.target.value as CameraFormData['protocol'] }))}
            className="w-full h-10 rounded-md border px-3">
            <option value="rtsp">RTSP</option>
            <option value="http">HTTP</option>
            <option value="onvif">ONVIF</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">Localização</label>
          <Input value={data.location} onChange={e => setData(d => ({ ...d, location: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Usuário</label>
          <Input value={data.username} onChange={e => setData(d => ({ ...d, username: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium">Senha</label>
          <Input type="password" value={data.password} onChange={e => setData(d => ({ ...d, password: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}><X className="h-4 w-4 mr-1" />Cancelar</Button>}
        <Button type="submit"><Save className="h-4 w-4 mr-1" />Salvar</Button>
      </div>
    </form>
  );
}

export default CameraForm;
