import AudioSampler from "@/components/audio-sampler";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-8">Clap Backer</h1>
        <AudioSampler />
      </div>
    </main>
  );
}
