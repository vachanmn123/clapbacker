"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import AudioVisualizer from "./audio-visulaizer";
import { debounce } from "lodash";

export default function AudioSampler() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Float32Array | null>(null);
  const [volume, setVolume] = useState(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioSource, setAudioSource] =
    useState<MediaStreamAudioSourceNode | null>(null);
  const [availableSources, setAvailableSources] = useState<MediaDeviceInfo[]>(
    []
  );
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    undefined
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);

  const [clapBackAudio, setClapBackAudio] = useState<HTMLAudioElement | null>(
    null
  );

  useEffect(() => {
    setClapBackAudio(new Audio("/clap.mp3"));
  }, []);

  // Fetch available audio input devices
  useEffect(() => {
    (async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputDevices = devices.filter(
        (device) => device.kind === "audioinput"
      );
      setAvailableSources(audioInputDevices);
      if (audioInputDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(audioInputDevices[0].deviceId);
      }
    })();
  }, []);

  // (Re-)Initialize audio when selected device changes or when starting recording
  const initAudio = async (deviceId: string) => {
    try {
      // Stop previous stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContext) {
        await audioContext.close();
        setAudioContext(null);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      streamRef.current = stream;

      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const analyzerNode = context.createAnalyser();

      analyzerNode.fftSize = 256;
      source.connect(analyzerNode);

      setAudioContext(context);
      setAudioSource(source);
      setAnalyzer(analyzerNode);

      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error(
        "Microphone access error. Please allow microphone access to use this feature."
      );
      return false;
    }
  };

  // Start recording and analyzing audio
  const startRecording = async () => {
    if (!selectedDeviceId) {
      toast.error("No audio input device selected.");
      return;
    }
    const success = await initAudio(selectedDeviceId);
    if (!success) return;
    setIsRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
    setAudioSource(null);
    setAnalyzer(null);
    setAudioData(null);
    setVolume(0);
  };

  // Update audio data for visualization and processing
  useEffect(() => {
    if (!analyzer || !isRecording) {
      if (!isRecording) {
        setAudioData(null);
        setVolume(0);
      }
      return;
    }

    const dataArray = new Float32Array(analyzer.frequencyBinCount);

    let animationFrameId: number;
    const updateData = () => {
      if (!isRecording || !analyzer) return;

      analyzer.getFloatTimeDomainData(dataArray);
      setAudioData(dataArray.slice(0));

      // Calculate volume level (RMS)
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      setVolume(dataArray[0]);

      animationFrameId = requestAnimationFrame(updateData);

      if (rms > 0.02) {
        // User clapped
        clapBack();
      }
    };

    updateData();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyzer, isRecording]);

  const clapBack = debounce(() => {
    if (!isPlaying) {
      setIsPlaying(true);
      clapBackAudio?.play().then(() => {
        setIsPlaying(false);
      });
    }
  }, 200);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Handle device change
  const handleDeviceChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    if (isRecording) {
      // If currently recording, restart with new device
      setIsRecording(false);
      await initAudio(newDeviceId);
      setIsRecording(true);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Audio Input</h2>
            <select
              className="border border-gray-300 rounded-md p-2"
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              disabled={availableSources.length === 0}
            >
              {availableSources.map((source) => (
                <option key={source.deviceId} value={source.deviceId}>
                  {source.label || `Device ${source.deviceId}`}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                variant={isRecording ? "destructive" : "default"}
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <MicOff className="mr-2 h-4 w-4" />
                ) : (
                  <Mic className="mr-2 h-4 w-4" />
                )}
                {isRecording ? "Stop" : "Start"} Analysis
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Volume2 className="h-5 w-5" />
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-green-500 h-full transition-all duration-100"
                style={{ width: `${Math.min(volume * 100 * 5, 100)}%` }}
              />
            </div>
          </div>

          <div className="h-64 w-full bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
            <AudioVisualizer audioData={audioData} isActive={isRecording} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
