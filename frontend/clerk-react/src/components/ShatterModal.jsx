import React, { useState, useEffect, useRef } from "react";
import "./ShatterModal.css";

const SLOT_COUNT = 4;

const ShatterModal = ({ baseTask, onDeploy, onCancel }) => {
  const [steps, setSteps] = useState(Array(SLOT_COUNT).fill(""));
  const [error, setError] = useState(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (firstInputRef.current) firstInputRef.current.focus();
  }, []);

  const handleInputChange = (index, value) => {
    const next = [...steps];
    next[index] = value;
    setSteps(next);
    if (error) setError(null);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Enter" && steps[index].trim() !== "") {
      if (index < steps.length - 1) {
        document.getElementById(`step-${index + 1}`).focus();
      } else {
        handleDeploy();
      }
    }
  };

  const handleDeploy = () => {
    const filled = steps.filter((s) => s.trim() !== "");
    if (filled.length < SLOT_COUNT) {
      setError(`Name all ${SLOT_COUNT} steps to continue.`);
      return;
    }
    const subTasks = steps.map((text, i) => ({ id: i + 1, text: text.trim(), isDone: false }));
    onDeploy(subTasks);
  };

  return (
    <div className="shatter-overlay">
      <div className="shatter-container">
        <div className="shatter-header">
          <span className="shatter-eyebrow">◈ SPLIT · 4 × 30 MIN</span>
          <h2 className="shatter-title">{baseTask.title}</h2>
          <p className="shatter-subtitle">
            Break this task into four focused 30-minute sessions.
          </p>
        </div>

        <div className="shatter-inputs">
          {steps.map((step, index) => (
            <div key={index} className="shatter-input-row">
              <span className="shatter-step-num">0{index + 1}</span>
              <input
                id={`step-${index}`}
                ref={index === 0 ? firstInputRef : null}
                value={step}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={`Step ${index + 1}...`}
                className="shatter-input"
                autoComplete="on"
              />
            </div>
          ))}
        </div>

        {error && <p className="shatter-error">{error}</p>}

        <div className="shatter-button-group">
          <button onClick={handleDeploy} className="shatter-btn-deploy">
            Split into 4 sessions
          </button>
          <button onClick={onCancel} className="shatter-btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShatterModal;
