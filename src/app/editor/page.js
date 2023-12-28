"use client";
import { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import Draggable from "react-draggable";
import styles from "./page.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHtml5, faCss3, faJs } from "@fortawesome/free-brands-svg-icons";
import {
  faPlay,
  faCircleXmark,
  faExpand,
} from "@fortawesome/free-solid-svg-icons";

const files = {
  "index.html": {
    name: "index.html",
    language: "html",
    value: "",
  },
  "style.css": {
    name: "style.css",
    language: "css",
    value: "",
  },
  "script.js": {
    name: "script.js",
    language: "javascript",
    value: "",
  },
};

let mediaRecorder;
const audioChunks = [];
let codeEditor;
let recording = false;
const events = [];
let playbackInterval;
let currentEventIndex = 0;
let recordingStartTime;
let recordingDuration = 0;
let recordingInterval;

export default function Home() {
  const [fileName, setFileName] = useState("index.html");
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [jsCode, setJsCode] = useState("");
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState([]);
  const [recordingStartTime, setRecordingStartTime] = useState(0);
  const [recordedData, setRecordedData] = useState("");
  const [isRecordingStopped, setIsRecordingStopped] = useState(false);

  const editorRef = useRef(null);

  useEffect(() => {
    const runBtn = document.getElementById("runCode");
    const clsBtn = document.getElementById("closeWindow");
    runBtn?.addEventListener("click", () => {
      setHtmlCode(files["index.html"].value);
      setCssCode(files["style.css"].value);
      setJsCode(files["script.js"].value);
      document.getElementById("outputWindow").style.display = "block";
    });

    clsBtn?.addEventListener("click", () => {
      document.getElementById("outputWindow").style.display = "none";
    });
  }, []);

  function startCodePlayback() {
    // setHtmlCode("");
    // setCssCode("");
    // setJsCode("");

    const audioElement = document.getElementById("audioPlayback");

    clearInterval(playbackInterval);
    let lastEventIndex = -1; // To track the last event that was played
    playbackInterval = setInterval(() => {
      const currentTime = audioElement.currentTime * 1000; // current time in milliseconds

      // Find the latest event that should be played at the current time
      currentEventIndex = events.findIndex(
        (event) => event.timestamp >= currentTime
      );

      // Check if there's a new event to play
      if (currentEventIndex !== -1 && currentEventIndex !== lastEventIndex) {
        lastEventIndex = currentEventIndex;
        const currentEvent = events[currentEventIndex];
        console.log(currentEvent);

        if (editorRef.current) {
          if (currentEvent.currentFile !== fileName) {
            setFileName(currentEvent?.currentFile);
            editorRef.current.setValue("");
          }

          switch (currentEvent.currentFile) {
            case "index.html":
              editorRef.current.getModel().setValue(currentEvent.files.html);
              break;
            case "style.css":
              editorRef.current.getModel().setValue(currentEvent.files.css);
              break;
            case "script.js":
              editorRef.current.getModel().setValue(currentEvent.files.js);
              break;
            default:
              break;
          }
          // editorRef.current.getModel().setValue(currentEvent.files.html);
        }
      }
      clearMyInterval();
    }, 100); // check every 100ms
  }

  function clearMyInterval() {
    if (currentEventIndex === -1) {
      clearInterval(playbackInterval);
    }
  }

  const toggleRecording = async () => {
    if (!recording) {
      // Start Recording Logic
      setRecording(true);
      setRecordingStartTime(new Date().getTime());
      setEvents([]);
      audioChunks.length = 0;

      recordingDuration = 0;
      recordingInterval = setInterval(() => {
        recordingDuration++;
        document.getElementById(
          "status"
        ).textContent = `Recording... ${recordingDuration} seconds`;
      }, 1000);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        clearInterval(recordingInterval);
        // const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // document.getElementById('audioPlayback').src = URL.createObjectURL(audioBlob);
        // setRecordedData(JSON.stringify(events, null, 2));
        setIsRecordingStopped(true);
        document.getElementById(
          "status"
        ).textContent = `Recording stopped after ${recordingDuration} seconds`;
      };

      mediaRecorder.start();
      setRecording(true);
    } else {
      // Stop Recording Logic
      if (mediaRecorder) {
        mediaRecorder.stop();
        setRecording(false);
        clearInterval(recordingInterval);
      }
    }
  };

  useEffect(() => {
    if (isRecordingStopped) {
      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      document.getElementById("audioPlayback").src =
        URL.createObjectURL(audioBlob);
      setRecordedData(JSON.stringify(events, null, 2));
      setIsRecordingStopped(false); // Reset the flag
    }
  }, [isRecordingStopped]);

  function handleAudioSeek() {
    const audioElement = document.getElementById("audioPlayback");
    const seekTime = audioElement.currentTime * 1000;
    currentEventIndex = events.findIndex(
      (event) => event.timestamp >= seekTime
    );
    if (currentEventIndex > 0) {
      const code = events[currentEventIndex - 1].code;
      codeEditor.setValue(code);
    }
  }

  function downloadAudio() {
    const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(audioBlob);
    a.download = "recorded_audio.wav";
    a.click();
  }

  function toggleRecordedData() {
    const recordedData = document.getElementById("recordedData");
    if (recordedData.style.display === "none") {
      recordedData.style.display = "block";
      document.getElementById("toggleData").textContent = "Hide Recorded Data";
    } else {
      recordedData.style.display = "none";
      document.getElementById("toggleData").textContent = "Show Recorded Data";
    }
  }

  const handleEditorChange = (value, event) => {
    files[fileName].value = value;

    if (recording) {
      const currentTime = new Date().getTime() - recordingStartTime;
      const allFileContents = {
        html: files["index.html"].value,
        css: files["style.css"].value,
        js: files["script.js"].value,
      };
      setEvents((prevEvents) => [
        ...prevEvents,
        {
          timestamp: currentTime,
          files: allFileContents,
          currentFile: fileName,
        },
      ]);
    }
  };

  const handleClick = () => {
    files[fileName].value = value;

    if (recording) {
      const currentTime = new Date().getTime() - recordingStartTime;
      const allFileContents = {
        html: files["index.html"].value,
        css: files["style.css"].value,
        js: files["script.js"].value,
      };
      setEvents((prevEvents) => [
        ...prevEvents,
        {
          timestamp: currentTime,
          files: "",
          currentFile: fileName,
        },
      ]);
    }
  };

  const toggleFullscreen = () => {
    const iframe = document.getElementById("outputIframe");
    if (!document.fullscreenElement) {
      if (iframe.requestFullscreen) {
        iframe.requestFullscreen();
      } else if (iframe.mozRequestFullScreen) {
        /* Firefox */
        iframe.mozRequestFullScreen();
      } else if (iframe.webkitRequestFullscreen) {
        /* Chrome, Safari & Opera */
        iframe.webkitRequestFullscreen();
      } else if (iframe.msRequestFullscreen) {
        /* IE/Edge */
        iframe.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        /* Firefox */
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        /* Chrome, Safari & Opera */
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        /* IE/Edge */
        document.msExitFullscreen();
      }
    }
  };

  const file = files[fileName];

  return (
    <>
      <div>
        <div className={styles.topBar}>
          <button
            className={styles.htmlButton}
            disabled={fileName === "index.html"}
            onClick={() => setFileName("index.html")}
          >
            <div>
              <FontAwesomeIcon icon={faHtml5} />
            </div>
            index.html
          </button>
          <button
            className={styles.cssButton}
            disabled={fileName === "style.css"}
            onClick={() => setFileName("style.css")}
          >
            <div>
              <FontAwesomeIcon icon={faCss3} />
            </div>
            style.css
          </button>
          <button
            className={styles.jsButton}
            disabled={fileName === "script.js"}
            onClick={() => setFileName("script.js")}
          >
            <div>
              <FontAwesomeIcon icon={faJs} />
            </div>{" "}
            script.js
          </button>
          <button className={styles.playButton} id="runCode">
            <div>
              <FontAwesomeIcon icon={faPlay} />
            </div>{" "}
            Run
          </button>
          <audio
            controls
            id="audioPlayback"
            onPlay={startCodePlayback}
            onSeeked={handleAudioSeek}
          ></audio>
          {/* <button onClick={startRecording}>Start Recording</button>
          <button onClick={stopRecording}>Stop Recording</button> */}
          <button onClick={toggleRecording}>
            {recording ? "Stop Recording" : "Start Recording"}
          </button>
          <span id="status"></span>
          <button id="toggleData" onClick={toggleRecordedData}>
            Show Recorded Data
          </button>
        </div>
        <Editor
          height="70vh"
          theme="vs-dark"
          saveViewState={true}
          path={file.name}
          defaultLanguage={file.language}
          defaultValue={file.value}
          onChange={handleEditorChange}
          onClick={handleClick}
          value={file.value}
          onMount={(editor, monaco) => {
            editorRef.current = editor; // keep a reference to the editor
          }}
          id="ed"
        />
        <pre id="recordedData">{recordedData}</pre>
      </div>
      <Draggable>
        <div className={styles.websiteWindow} id="outputWindow">
          <div className={styles.buttonBlock}>
            <button className={styles.closeButton} id="closeWindow">
              <FontAwesomeIcon icon={faCircleXmark} />
            </button>
            <button onClick={toggleFullscreen} className={styles.maxWindow}>
              <FontAwesomeIcon icon={faExpand} />
            </button>
          </div>
          <iframe
            title="output"
            srcDoc={`
            <html>
              <style>${cssCode}</style>
              <body>${htmlCode}</body>
              <script>${jsCode}</script>
            </html>
          `}
            className={styles.outputiframewindow}
            id="outputIframe"
          />
        </div>
      </Draggable>
    </>
  );
}
