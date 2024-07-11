import axios from "axios";
import React, { useState, useEffect, useRef } from "react";
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const LOCAL_STORAGE_KEY = "customProgressions";

interface Progression {
  name: string;
  chords: string;
  solo: string;
  info: string;
}

interface Progressions {
  jazz: Progression[];
  custom: Progression[];
}

const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const App: React.FC = () => {
  const [progressions, setProgressions] = useState<Progressions>({
    jazz: [],
    custom: [],
  });
  const [
    currentProgression,
    setCurrentProgression,
  ] = useState<Progression | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [animationMode, setAnimationMode] = useState<
    "chords" | "both" | "solo"
  >("both");
  const [currentChord, setCurrentChord] = useState("");
  const [currentSolo, setCurrentSolo] = useState("");
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [delayTime, setDelayTime] = useState(0.3);
  const [reverbLevel, setReverbLevel] = useState(0.5);

  const audioContextRef = useRef<AudioContext | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  useEffect(() => {
    simulateFetchProgressions();
    loadCustomProgressions();
    initializeAudioContext();
  }, []);

  const initializeAudioContext = async () => {
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    delayNodeRef.current = audioContextRef.current.createDelay(5.0);
    delayNodeRef.current.delayTime.value = delayTime;

    reverbNodeRef.current = audioContextRef.current.createConvolver();
    reverbGainRef.current = audioContextRef.current.createGain();
    reverbGainRef.current.gain.value = reverbLevel;

    try {
      const response = await fetch("/path/to/impulse-response.wav");
      const arrayBuffer = await response.arrayBuffer();
      const impulseResponse = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );
      reverbNodeRef.current.buffer = impulseResponse;
    } catch (error) {
      console.error("Failed to load impulse response:", error);
      const length = 2 * audioContextRef.current.sampleRate;
      const impulse = audioContextRef.current.createBuffer(
        2,
        length,
        audioContextRef.current.sampleRate
      );
      const impulseL = impulse.getChannelData(0);
      const impulseR = impulse.getChannelData(1);
      for (let i = 0; i < length; i++) {
        impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
        impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
      reverbNodeRef.current.buffer = impulse;
    }

    delayNodeRef.current.connect(reverbNodeRef.current);
    reverbNodeRef.current.connect(reverbGainRef.current);
    reverbGainRef.current.connect(audioContextRef.current.destination);
  };

  const createPianoSound = (
    frequency: number,
    startTime: number,
    duration: number
  ) => {
    if (!audioContextRef.current) return;

    const ctx = audioContextRef.current;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc3.type = "square";

    osc1.frequency.setValueAtTime(frequency, startTime);
    osc2.frequency.setValueAtTime(frequency * 2, startTime);
    osc3.frequency.setValueAtTime(frequency * 4, startTime);

    const gainNode = ctx.createGain();
    const gainNode2 = ctx.createGain();
    const gainNode3 = ctx.createGain();

    const attackTime = 0.01;
    const decayTime = 0.1;
    const sustainLevel = 0.7;
    const releaseTime = 0.3;

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(1, startTime + attackTime);
    gainNode.gain.linearRampToValueAtTime(
      sustainLevel,
      startTime + attackTime + decayTime
    );
    gainNode.gain.setValueAtTime(
      sustainLevel,
      startTime + duration - releaseTime
    );
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    gainNode2.gain.setValueAtTime(0.5, startTime);
    gainNode3.gain.setValueAtTime(0.2, startTime);

    osc1.connect(gainNode);
    osc2.connect(gainNode2);
    osc3.connect(gainNode3);

    gainNode.connect(delayNodeRef.current!);
    gainNode2.connect(delayNodeRef.current!);
    gainNode3.connect(delayNodeRef.current!);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);
    osc1.stop(startTime + duration);
    osc2.stop(startTime + duration);
    osc3.stop(startTime + duration);
  };

  const playNote = (note: string) => {
    if (!audioContextRef.current) return;

    const freq = noteToFrequency(note);
    const startTime = audioContextRef.current.currentTime;
    createPianoSound(freq, startTime, 0.5); // 0.5 seconds duration
  };

  const noteToFrequency = (note: string): number => {
    const octave = parseInt(note.slice(-1));
    const noteName = note.slice(0, -1);
    const noteIndex = notes.indexOf(noteName);
    return 440 * Math.pow(2, (noteIndex - 9) / 12 + (octave - 4));
  };

  const playChord = (chord: string) => {
    const chordNotes = getChordNotes(chord);
    chordNotes.forEach((note, index) => {
      const freq = noteToFrequency(note);
      const startTime = audioContextRef.current!.currentTime + index * 0.02; // Slight arpeggio effect
      createPianoSound(freq, startTime, 0.5); // 0.5 seconds duration
    });
  };

  const simulateFetchProgressions = () => {
    setTimeout(() => {
      const fetchedProgressions: Progressions = {
        custom: [],
        jazz: [
          {
            name: "ii-V-I",
            chords: "Dm7 G7 Cmaj7",
            solo: "F4 B4 E5",
            info:
              "The most common jazz progression. Forms the basis for many standards like 'All The Things You Are'.",
          },
          {
            name: "I-vi-ii-V",
            chords: "Cmaj7 Am7 Dm7 G7",
            solo: "E5 C5 F5 B4",
            info:
              "Known as the 'rhythm changes' progression. It's the basis for Gershwin's 'I Got Rhythm'.",
          },
        ],
      };
      setProgressions(fetchedProgressions);
    }, 1000);
  };

  const loadCustomProgressions = () => {
    const savedProgressions = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedProgressions) {
      const parsedProgressions = JSON.parse(savedProgressions);
      setProgressions((prev) => ({ ...prev, custom: parsedProgressions }));
    }
  };

  const saveCustomProgression = (progression: Progression) => {
    const updatedCustom = [...progressions.custom, progression];
    setProgressions((prev) => ({ ...prev, custom: updatedCustom }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedCustom));
  };

  const getChordNotes = (chord: string): string[] => {
    if (!chord) return [];

    const [root, ...rest] = chord.split("");
    const chordType = rest.join("");
    const rootIndex = notes.indexOf(root.toUpperCase());
    const octave = 4;
    let intervals: number[] = [];

    switch (chordType) {
      case "":
      case "maj":
        intervals = [0, 4, 7];
        break;
      case "m":
      case "min":
        intervals = [0, 3, 7];
        break;
      case "7":
        intervals = [0, 4, 7, 10];
        break;
      case "maj7":
        intervals = [0, 4, 7, 11];
        break;
      case "m7":
      case "min7":
        intervals = [0, 3, 7, 10];
        break;
      default:
        return [];
    }

    return intervals.map((interval) => {
      const noteIndex = (rootIndex + interval) % 12;
      return `${notes[noteIndex]}${octave}`;
    });
  };

  const highlightKeys = (chord: string, soloNote: string) => {
    setCurrentChord(chord);
    setCurrentSolo(soloNote);
    playChord(chord);
    if (soloNote) playNote(soloNote);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setCurrentChord("");
      setCurrentSolo("");
    } else if (currentProgression) {
      setIsPlaying(true);
      const chords = currentProgression.chords.split(" ");
      const soloNotes = currentProgression.solo.split(" ");
      let currentIndex = 0;

      const playNextChord = () => {
        if (!isPlaying) return;

        highlightKeys(chords[currentIndex], soloNotes[currentIndex]);
        currentIndex = (currentIndex + 1) % chords.length;

        setTimeout(playNextChord, 1000 / speed);
      };

      playNextChord();
    }
  };

  const loadProgression = (progression: Progression) => {
    setCurrentProgression(progression);
    if (isPlaying) {
      togglePlay(); // Stop if playing
    }
    highlightKeys(
      progression.chords.split(" ")[0],
      progression.solo.split(" ")[0]
    );
  };

  const generateCustomProgression = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "user",
              content: `Create a piano chord progression based on this description: "${userInput}". 
              Reply only with a JSON string that follows this interface: 
              interface Progression {
                name: string;
                chords: string;
                solo: string;
                info: string;
              }
              
              Follow these specific guidelines:
              1. The 'name' should be a short, descriptive title for the progression.
              2. The 'chords' should be a space-separated string of chord symbols, NOT individual notes. For example: "Cmaj7 Am7 Dm7 G7" is correct, but "C4 E4 G4 B4, A3 C4 E4 G4" is not.
              3. Each chord symbol should follow standard notation: root note (uppercase) followed by quality (maj, min, dim, aug, etc.) and extensions (7, 9, 11, etc.) if applicable. Examples: C, Dm, Gmaj7, F#m7b5.
              4. The 'solo' should be a space-separated string of individual notes with octave numbers, representing a melodic line that fits over the chord progression. For example: "C5 E5 G5 B5 A5 G5 F5 D5".
              5. The 'info' should provide a brief description of the progression, its mood, or potential use in music.
              
              Ensure the JSON is valid and can be parsed without errors.`,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const progressionString = response.data.choices[0].message.content;
      const customProgression: Progression = JSON.parse(progressionString);

      saveCustomProgression(customProgression);
      loadProgression(customProgression);
    } catch (error) {
      console.error("Error generating custom progression:", error);
      alert("Failed to generate custom progression. Please try again.");
    } finally {
      setIsLoading(false);
      setUserInput("");
    }
  };

  const updateDelayTime = (value: number) => {
    setDelayTime(value);
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = value;
    }
  };

  const updateReverbLevel = (value: number) => {
    setReverbLevel(value);
    if (reverbGainRef.current) {
      reverbGainRef.current.gain.value = value;
    }
  };

  const Piano: React.FC = () => {
    const chordNotes = getChordNotes(currentChord);
    console.log(chordNotes);

    return (
      <div className="flex overflow-x-auto bg-gray-900 p-6 shadow-lg rounded-lg">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((octave) => (
          <div key={octave} className="flex">
            {notes.map((note) => {
              if (octave === 0 && notes.indexOf(note) < 3) return null;
              if (octave === 8 && notes.indexOf(note) > 0) return null;

              const isBlack = note.includes("#");
              const keyNote = `${note}${octave}`;
              const isActive = chordNotes.includes(keyNote);
              const isSolo = currentSolo === keyNote;

              return (
                <div
                  key={keyNote}
                  className={`
                    ${
                      isBlack
                        ? "bg-gray-800 text-gray-300 h-24 w-5 -mx-1.5 z-10"
                        : "bg-white h-40 w-8"
                    }
                    ${
                      isActive &&
                      (animationMode === "chords" || animationMode === "both")
                        ? isBlack
                          ? "bg-red-600"
                          : "bg-red-400"
                        : ""
                    }
                    ${
                      isSolo &&
                      (animationMode === "solo" || animationMode === "both")
                        ? isBlack
                          ? "bg-green-600"
                          : "bg-green-400"
                        : ""
                    }
                    border border-gray-700 flex items-end justify-center pb-1 text-xs cursor-pointer transition-all duration-200 hover:opacity-80
                  `}
                >
                  {keyNote}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col p-8 w-full min-h-screen bg-gray-100 text-gray-800">
      <h1 className="text-4xl font-bold mb-6 text-center text-indigo-600">
        Interactive Piano Chord Progression Visualizer
      </h1>
      <div className="text-3xl font-bold mb-6 h-16 flex items-center justify-center text-indigo-800">
        {currentChord}{" "}
        {currentSolo && (
          <span className="text-green-600">(Solo: {currentSolo})</span>
        )}
      </div>
      <Piano />
      <div className="mt-8 flex flex-col items-center space-y-6 bg-white p-6 rounded-lg shadow-md">
        <input
          className="w-full max-w-md p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Enter chord progression (e.g., Cmaj7 Dm7 G7)"
          value={currentProgression?.chords || ""}
          readOnly
        />
        <div className="flex items-center space-x-4 w-full max-w-md">
          <label className="text-lg font-medium">Speed:</label>
          <input
            type="range"
            min="0.1"
            max="2"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full"
          />
          <span className="text-lg font-medium">{speed.toFixed(1)}</span>
        </div>
        <div className="flex items-center space-x-4 w-full max-w-md">
          <label className="text-lg font-medium">Animation Mode:</label>
          <select
            value={animationMode}
            onChange={(e) =>
              setAnimationMode(e.target.value as "chords" | "both" | "solo")
            }
            className="p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="chords">Chords Only</option>
            <option value="both">Chords and Solo</option>
            <option value="solo">Solo Only</option>
          </select>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <label>Delay Time:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={delayTime}
            onChange={(e) => updateDelayTime(parseFloat(e.target.value))}
          />
        </div>
        <div className="mt-4 flex items-center space-x-4">
          <label>Reverb Level:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={reverbLevel}
            onChange={(e) => updateReverbLevel(parseFloat(e.target.value))}
          />
        </div>

        <button
          onClick={togglePlay}
          className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {isPlaying ? "Stop" : "Play"}
        </button>
      </div>
      <div className="mt-8 flex flex-col items-center space-y-6 bg-white p-6 rounded-lg shadow-md">
        <div className="w-full max-w-md">
          <input
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Describe a chord progression..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
          />
          <button
            onClick={generateCustomProgression}
            disabled={isLoading}
            className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-300"
          >
            {isLoading ? "Generating..." : "Generate Custom Progression"}
          </button>
        </div>
      </div>
      <div className="mt-8 flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-6">
        <div className="w-full md:w-64 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-indigo-600">
            Jazz Progressions
          </h3>
          <ul className="space-y-2">
            {progressions.jazz.map((prog, index) => (
              <li
                key={index}
                onClick={() => loadProgression(prog)}
                className="p-3 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors duration-200"
              >
                {prog.name}
              </li>
            ))}
          </ul>
          <h3 className="text-2xl font-semibold mb-4 mt-6 text-indigo-600">
            Custom Progressions
          </h3>
          <ul className="space-y-2">
            {progressions.custom.map((prog, index) => (
              <li
                key={index}
                onClick={() => loadProgression(prog)}
                className="p-3 bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200 transition-colors duration-200"
              >
                {prog.name}
              </li>
            ))}
          </ul>
          <button
            onClick={simulateFetchProgressions}
            className="mt-6 w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Refetch Progressions
          </button>
        </div>
        <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-indigo-600">
            Progression Information
          </h3>
          {currentProgression ? (
            <>
              <p className="mb-2">
                <strong className="text-indigo-600">Chords:</strong>{" "}
                {currentProgression.chords}
              </p>
              <p className="mb-2">
                <strong className="text-green-600">Solo:</strong>{" "}
                {currentProgression.solo}
              </p>
              <p className="text-gray-700">{currentProgression.info}</p>
            </>
          ) : (
            <p className="text-gray-500 italic">
              Select a progression to see details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
export default App;
