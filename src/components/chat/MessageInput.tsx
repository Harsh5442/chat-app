
import { useState, useRef } from "react";
import { useChats } from "@/context/chats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Paperclip, Smile } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export function MessageInput() {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { sendMessage, currentChat } = useChats();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await sendMessage(message);
    setMessage("");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        // File size validation (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error("File size exceeds 10MB limit");
          return;
        }
        
        await sendMessage(`Sent ${file.type.includes('image') ? 'an image' : 'a file'}: ${file.name}`, file);
        toast.success("File uploaded successfully");
      } catch (error) {
        toast.error("Failed to upload file");
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };
  
  if (!currentChat) {
    return null;
  }

  return (
    <div className="border-t border-chat-border bg-white p-2">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <Button 
          type="button"
          variant="ghost" 
          size="icon" 
          className="text-gray-600"
          onClick={() => {}}
        >
          <Smile className="h-6 w-6" />
        </Button>
        
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message"
            className="rounded-full bg-chat-bg border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm py-6"
            disabled={isUploading}
          />
        </div>
        
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button 
          type="button"
          variant="ghost" 
          size="icon" 
          className="text-gray-600"
          onClick={openFileDialog}
          disabled={isUploading}
        >
          <Paperclip className="h-6 w-6" />
        </Button>
        
        <Button 
          type="submit" 
          size="icon" 
          disabled={!message.trim() || isUploading}
          className="bg-whatsapp-teal hover:bg-whatsapp-dark text-white rounded-full h-10 w-10 flex items-center justify-center"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
