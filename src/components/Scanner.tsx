import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ScannerProps {
  onCapture: (base64: string, mimeType: string) => void;
  isProcessing: boolean;
}

export function Scanner({ onCapture, isProcessing }: ScannerProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Seu navegador não suporta acesso à câmera.");
      }

      // Limpa stream anterior se existir
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      let newStream: MediaStream;
      try {
        // Tenta câmera traseira em dispositivos móveis
        newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: 'environment' } } 
        });
      } catch (e) {
        console.warn("Câmera traseira não disponível, tentando padrão.", e);
        // Fallback básico
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(newStream);
      setShowCamera(true);
      
      // Pequeno delay para garantir que o elemento de vídeo seja montado antes de anexar o stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      }, 100);

    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert("Acesso à câmera negado. Por favor, habilite as permissões de câmera ou use o envio de imagem da galeria.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message.includes('device not found')) {
          alert("Câmera não encontrada. Isso pode ocorrer em alguns navegadores ou dispositivos sem hardware de câmera. Por favor, use o botão 'Enviar Imagem' para selecionar uma foto da sua galeria.");
        } else {
          alert(`Erro na câmera: ${err.message}. Tente usar o envio de fotos da galeria.`);
        }
      } else {
        alert("Ocorreu um erro ao acessar a câmera. Por favor, use a opção de carregar da galeria.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg');
      onCapture(base64, 'image/jpeg');
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {!showCamera ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <button
              id="btn-camera-start"
              onClick={startCamera}
              disabled={isProcessing}
              className="group relative h-64 bento-card flex flex-col items-center justify-center gap-4 hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-[24px] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] transition-all duration-500">
                <Camera className="w-8 h-8" />
              </div>
              <div className="text-center">
                <span className="block text-lg font-bold uppercase tracking-widest text-[var(--text-main)]">Câmera ao Vivo</span>
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Identificação Instantânea</span>
              </div>
            </button>

            <button
              id="btn-upload-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="group relative h-64 bento-card flex flex-col items-center justify-center gap-4 hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
            >
              <div className="w-16 h-16 rounded-[24px] bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--accent-foreground)] transition-all duration-500">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <span className="block text-lg font-bold uppercase tracking-widest text-[var(--text-main)]">Enviar Imagem</span>
                <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">Da Galeria de Fotos</span>
              </div>
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="relative rounded-[40px] overflow-hidden bg-black aspect-[4/5] shadow-2xl border-4 border-white"
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-x-0 bottom-0 p-10 flex justify-between items-center bg-gradient-to-t from-black/80 to-transparent">
              <button
                id="btn-camera-close"
                onClick={stopCamera}
                className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              
              <button
                id="btn-photo-capture"
                onClick={capturePhoto}
                className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center group active:scale-90 transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-white group-hover:bg-sage-50 transition-colors" />
              </button>
              
              <div className="w-14" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-10 bento-card text-center flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-[32px] bg-[var(--bg-secondary)] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
              </div>
              <Sparkles className="w-6 h-6 text-amber-500 absolute -top-2 -right-2 animate-bounce" />
            </div>
            <div>
              <h3 className="text-2xl font-bold uppercase tracking-tighter">Analisando Espécime</h3>
              <p className="text-sm font-medium opacity-50 mt-2">Consultando mais de 10 mil variantes botânicas em nossa base de dados...</p>
            </div>
            <div className="w-48 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[var(--accent)]"
                animate={{ x: [-200, 200] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
