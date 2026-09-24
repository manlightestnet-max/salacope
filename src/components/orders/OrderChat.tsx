import React, { useState, useRef, useEffect } from 'react';
import { OrderItem, OrderAttachment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Send,
  Paperclip,
  Smile,
  ShieldCheck,
  FileText,
  Download,
  X,
  User,
  CheckCircle,
} from 'lucide-react';

interface OrderChatProps {
  order: OrderItem;
}

export const OrderChat: React.FC<OrderChatProps> = ({ order }) => {
  const { user, sendOrderMessage, addOrderReaction } = useAuth();
  const [content, setContent] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<OrderAttachment[]>([]);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const messages = order.messages || [];

  const scrollToBottom = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      const sizeStr = Number(sizeMb) < 1
        ? `${Math.round(file.size / 1024)} Ko`
        : `${sizeMb} Mo`;

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: OrderAttachment = {
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: sizeStr,
          type: file.type || 'application/octet-stream',
          dataUrl: reader.result as string,
        };
        setAttachedFiles((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent && attachedFiles.length === 0) return;

    sendOrderMessage(order.id, {
      content: cleanContent,
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
    });

    setContent('');
    setAttachedFiles([]);
    setIsEmojiPickerOpen(false);
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return '';
    }
  };

  const availableEmojis = ['👍', '❤️', '✅', '🙏', '🔥'];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Chat Header */}
      <div className="p-3.5 sm:p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-xs font-heading">
            {order.buyerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900 font-heading">
              Discussion : {order.buyerName}
            </div>
            <div className="text-[10px] text-gray-400">
              Commande #{order.id.slice(0, 10)} • Canal sécurisé
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>Échanges protégés</span>
        </div>
      </div>

      {/* Trust Notice */}
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 flex items-center gap-1.5 shrink-0">
        <ShieldCheck className="w-3 h-3 text-primary-600 shrink-0" />
        <span className="truncate">
          Conservez tous vos échanges ici pour garantir la conformité et la protection des livrables.
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div ref={chatScrollContainerRef} className="flex-1 p-3 sm:p-4 overflow-y-auto custom-scrollbar space-y-3 bg-gray-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-gray-600">Aucun message pour cette commande</p>
            <p className="text-[11px] max-w-xs text-gray-400">
              Commencez la discussion avec votre client pour cadrer les besoins, partager des fichiers ou poser des questions.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderRole === user.role || msg.senderName === user.name;
            const isSystem = msg.senderRole === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="inline-block px-2.5 py-1 text-[10px] font-medium text-gray-500 bg-gray-100 rounded-full">
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${
                  isMe ? 'ml-auto' : 'mr-auto'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-gray-400">
                  <span className="font-semibold text-gray-700">{msg.senderName}</span>
                  <span>•</span>
                  <span>{formatMessageTime(msg.createdAt)}</span>
                </div>

                <div
                  className={`p-3 rounded-sm text-xs leading-relaxed shadow-2xs ${
                    isMe
                      ? 'bg-primary-600 text-white rounded-br-none'
                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}

                  {/* Attachments inside message */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 space-y-1.5 pt-2 border-t border-white/20">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className={`flex items-center justify-between gap-2 p-1.5 rounded-xs text-[11px] ${
                            isMe ? 'bg-primary-700/60 text-white' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]" title={att.name}>
                              {att.name}
                            </span>
                            <span className="text-[9px] opacity-75 shrink-0">({att.size})</span>
                          </div>
                          {att.dataUrl && (
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="p-1 hover:opacity-80 transition-opacity"
                              title="Télécharger la pièce jointe"
                            >
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                <div className="flex items-center gap-1 mt-1">
                  {msg.reactions && msg.reactions.map((react) => (
                    <button
                      key={react.emoji}
                      type="button"
                      onClick={() => addOrderReaction(order.id, msg.id, react.emoji)}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors cursor-pointer ${
                        react.users.includes(user.name || 'Moi')
                          ? 'bg-primary-50 text-primary-700 border-primary-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span>{react.emoji}</span>
                      <span className="font-bold text-[9px]">{react.count}</span>
                    </button>
                  ))}

                  {/* Quick react hover button */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      title="Ajouter une réaction"
                    >
                      <Smile className="w-3 h-3" />
                    </button>
                    <div className="hidden group-hover:flex absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-sm shadow-md p-1 gap-1 z-10">
                      {availableEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => addOrderReaction(order.id, msg.id, emoji)}
                          className="hover:scale-125 transition-transform p-0.5 text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attachment Preview Bar */}
      {attachedFiles.length > 0 && (
        <div className="p-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 shrink-0">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1.5 bg-white border border-gray-200 px-2 py-1 rounded-xs text-[11px] shadow-2xs"
            >
              <FileText className="w-3 h-3 text-primary-600" />
              <span className="truncate max-w-[120px] text-gray-700">{file.name}</span>
              <span className="text-[9px] text-gray-400">({file.size})</span>
              <button
                type="button"
                onClick={() => removeAttachment(file.id)}
                className="text-gray-400 hover:text-rose-500 ml-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Message Composer */}
      <form onSubmit={handleSend} className="p-2.5 sm:p-3 border-t border-gray-200 bg-white shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          className="hidden"
        />

        <div className="flex items-end gap-2">
          {/* Attach Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer shrink-0"
            title="Joindre un fichier (document, image, archive)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Quick Emoji Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xs transition-colors cursor-pointer shrink-0"
              title="Ajouter un émoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            {isEmojiPickerOpen && (
              <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-sm shadow-lg p-1.5 flex gap-1 z-20">
                {availableEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setContent((prev) => prev + emoji);
                      setIsEmojiPickerOpen(false);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Input */}
          <textarea
            rows={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder={`Écrire un message à ${order.buyerName}...`}
            className="flex-1 min-h-[38px] max-h-[120px] resize-none py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-sm focus:outline-none focus:border-primary-600 focus:bg-white text-gray-900 transition-colors"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!content.trim() && attachedFiles.length === 0}
            className={`p-2 rounded-xs font-semibold transition-all shrink-0 cursor-pointer ${
              content.trim() || attachedFiles.length > 0
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-2xs'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            title="Envoyer le message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
