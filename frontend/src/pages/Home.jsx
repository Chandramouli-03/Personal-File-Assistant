import ChatInterface from '../components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="flex-1 overflow-hidden bg-background-light dark:bg-background-dark">
      <div className="h-full">
        <ChatInterface />
      </div>
    </main>
  );
}
