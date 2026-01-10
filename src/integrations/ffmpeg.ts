/**
 * FFmpeg Integration Service
 * Wrapper for FFmpeg.wasm for client-side video processing
 */

import type { FFmpeg } from '@ffmpeg/ffmpeg';

export interface FFmpegConfig {
  log: boolean;
  corePath?: string;
  wasmPath?: string;
}

export interface TranscodeOptions {
  inputFormat?: string;
  outputFormat: string;
  videoBitrate?: string;
  audioBitrate?: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
  fps?: number;
  startTime?: number;
  duration?: number;
  customArgs?: string[];
}

export interface ThumbnailOptions {
  time?: number;
  width?: number;
  height?: number;
  quality?: number;
}

export interface ClipOptions {
  startTime: number;
  endTime: number;
  outputFormat?: string;
}

export type ProgressCallback = (progress: number) => void;

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  private progressCallback?: ProgressCallback;

  /**
   * Load FFmpeg library
   */
  async load(config?: Partial<FFmpegConfig>): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) {
      // Wait for existing load to complete
      while (this.isLoading) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.isLoaded;
    }

    this.isLoading = true;

    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');

      this.ffmpeg = new FFmpeg();

      // Set up logging
      if (config?.log !== false) {
        this.ffmpeg.on('log', ({ message }) => {
                  });
      }

      // Set up progress tracking
      this.ffmpeg.on('progress', ({ progress }) => {
        this.progressCallback?.(Math.round(progress * 100));
      });

      // Load FFmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await this.ffmpeg.load({
        coreURL: config?.corePath || await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: config?.wasmPath || await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.isLoaded = true;
            return true;
    } catch (error) {
            this.isLoaded = false;
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Set progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Transcode video
   */
  async transcode(
    inputFile: File | Blob,
    options: TranscodeOptions,
    outputFilename?: string
  ): Promise<Blob | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.' + (options.inputFormat || 'mp4');
      const outputName = outputFilename || `output.${options.outputFormat}`;

      // Write input file
      await this.ffmpeg.writeFile(inputName, await fetchFile(inputFile));

      // Build FFmpeg command
      const args: string[] = ['-i', inputName];

      if (options.videoCodec) {
        args.push('-c:v', options.videoCodec);
      }
      if (options.audioCodec) {
        args.push('-c:a', options.audioCodec);
      }
      if (options.videoBitrate) {
        args.push('-b:v', options.videoBitrate);
      }
      if (options.audioBitrate) {
        args.push('-b:a', options.audioBitrate);
      }
      if (options.resolution) {
        args.push('-s', options.resolution);
      }
      if (options.fps) {
        args.push('-r', options.fps.toString());
      }
      if (options.startTime !== undefined) {
        args.push('-ss', options.startTime.toString());
      }
      if (options.duration !== undefined) {
        args.push('-t', options.duration.toString());
      }
      if (options.customArgs) {
        args.push(...options.customArgs);
      }

      args.push(outputName);

      // Execute FFmpeg
      await this.ffmpeg.exec(args);

      // Read output file
      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: `video/${options.outputFormat}` });

      // Cleanup
      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return blob;
    } catch (error) {
            return null;
    }
  }

  /**
   * Extract thumbnail from video
   */
  async extractThumbnail(
    videoFile: File | Blob,
    options: ThumbnailOptions = {}
  ): Promise<Blob | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.mp4';
      const outputName = 'thumbnail.jpg';

      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const args: string[] = ['-i', inputName];
      
      // Seek to specific time
      if (options.time !== undefined) {
        args.push('-ss', options.time.toString());
      } else {
        args.push('-ss', '0');
      }

      args.push('-frames:v', '1');

      // Set size
      if (options.width && options.height) {
        args.push('-s', `${options.width}x${options.height}`);
      } else if (options.width) {
        args.push('-vf', `scale=${options.width}:-1`);
      }

      // Set quality
      if (options.quality) {
        args.push('-q:v', (31 - Math.floor(options.quality * 0.31)).toString());
      }

      args.push(outputName);

      await this.ffmpeg.exec(args);

      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/jpeg' });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return blob;
    } catch (error) {
            return null;
    }
  }

  /**
   * Extract multiple thumbnails as a sprite sheet
   */
  async extractThumbnailSprite(
    videoFile: File | Blob,
    count: number = 10,
    columns: number = 5
  ): Promise<Blob | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.mp4';
      const outputName = 'sprite.jpg';

      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Extract frames and create tile
      await this.ffmpeg.exec([
        '-i', inputName,
        '-vf', `select='not(mod(n\\,${Math.ceil(100 / count)}))',scale=160:-1,tile=${columns}x${Math.ceil(count / columns)}`,
        '-frames:v', '1',
        '-q:v', '5',
        outputName,
      ]);

      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/jpeg' });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return blob;
    } catch (error) {
            return null;
    }
  }

  /**
   * Cut/clip video
   */
  async clip(videoFile: File | Blob, options: ClipOptions): Promise<Blob | null> {
    const duration = options.endTime - options.startTime;
    
    return this.transcode(videoFile, {
      outputFormat: options.outputFormat || 'mp4',
      startTime: options.startTime,
      duration,
      videoCodec: 'copy',
      audioCodec: 'copy',
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(
    videoFile: File | Blob,
    format: 'mp3' | 'wav' | 'aac' = 'mp3'
  ): Promise<Blob | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.mp4';
      const outputName = `audio.${format}`;

      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const codecMap: Record<string, string> = {
        mp3: 'libmp3lame',
        wav: 'pcm_s16le',
        aac: 'aac',
      };

      await this.ffmpeg.exec([
        '-i', inputName,
        '-vn',
        '-c:a', codecMap[format],
        outputName,
      ]);

      const data = await this.ffmpeg.readFile(outputName);
      const mimeTypes: Record<string, string> = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        aac: 'audio/aac',
      };
      const blob = new Blob([data], { type: mimeTypes[format] });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(outputName);

      return blob;
    } catch (error) {
            return null;
    }
  }

  /**
   * Get video metadata
   */
  async getMetadata(videoFile: File | Blob): Promise<Record<string, string> | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.mp4';
      
      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const metadata: Record<string, string> = {};
      
      this.ffmpeg.on('log', ({ message }) => {
        const durationMatch = message.match(/Duration: (\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (durationMatch) {
          metadata.duration = durationMatch[1];
        }
        
        const streamMatch = message.match(/Stream.*Video: (\w+).*, (\d+x\d+)/);
        if (streamMatch) {
          metadata.codec = streamMatch[1];
          metadata.resolution = streamMatch[2];
        }
      });

      await this.ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
      await this.ffmpeg.deleteFile(inputName);

      return metadata;
    } catch (error) {
            return null;
    }
  }

  /**
   * Convert to GIF
   */
  async convertToGif(
    videoFile: File | Blob,
    options: { fps?: number; width?: number; startTime?: number; duration?: number } = {}
  ): Promise<Blob | null> {
    if (!await this.load()) return null;
    if (!this.ffmpeg) return null;

    try {
      const { fetchFile } = await import('@ffmpeg/util');
      const inputName = 'input.mp4';
      const paletteName = 'palette.png';
      const outputName = 'output.gif';

      await this.ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      const fps = options.fps || 10;
      const width = options.width || 320;
      const filters = `fps=${fps},scale=${width}:-1:flags=lanczos`;

      // Generate palette
      const paletteArgs = ['-i', inputName];
      if (options.startTime) paletteArgs.push('-ss', options.startTime.toString());
      if (options.duration) paletteArgs.push('-t', options.duration.toString());
      paletteArgs.push('-vf', `${filters},palettegen`, '-y', paletteName);
      
      await this.ffmpeg.exec(paletteArgs);

      // Generate GIF with palette
      const gifArgs = ['-i', inputName, '-i', paletteName];
      if (options.startTime) gifArgs.push('-ss', options.startTime.toString());
      if (options.duration) gifArgs.push('-t', options.duration.toString());
      gifArgs.push(
        '-lavfi', `${filters} [x]; [x][1:v] paletteuse`,
        '-y', outputName
      );

      await this.ffmpeg.exec(gifArgs);

      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data], { type: 'image/gif' });

      await this.ffmpeg.deleteFile(inputName);
      await this.ffmpeg.deleteFile(paletteName);
      await this.ffmpeg.deleteFile(outputName);

      return blob;
    } catch (error) {
            return null;
    }
  }

  /**
   * Check if FFmpeg is loaded
   */
  get loaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Terminate FFmpeg instance
   */
  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.isLoaded = false;
    }
  }
}

// Singleton instance
export const ffmpegService = new FFmpegService();

export default FFmpegService;
