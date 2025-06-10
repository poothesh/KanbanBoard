import React, { useState, useEffect, useContext, useReducer, createContext, useMemo, useRef } from "react";
import "../assets/KanbanBoard.css";

const KanbanContext = createContext();

const initialState = {
  todo: [ { id: "1", text: "Task A" }, 
    { id: "2", text: "Task B" }, 
    { id: "3", text: "Task C" }, 
    { id: "4", text: "Task D" } ],
  inProgress: [],
  done: []
};

function kanbanReducer(state, action) {
  switch (action.type) {
    case "MOVE_CARD": {
      const { card, from, to } = action.payload;
      return {
        ...state,
        [from]: state[from].filter((c) => c.id !== card.id),
        [to]: [ ...state[to], card ]
      };
    }
    case "ADD_TASK": {
      const newTask = { id: Date.now().toString(), text: action.payload.text };
      return {
        ...state,
        todo: [ ...state.todo, newTask ]
      };
    }
    case "DELETE_CARD": {
      const { cardId, from } = action.payload;
      return {
        ...state,
        [from]: state[from].filter((card) => card.id !== cardId)
      };
    }
    case "EDIT_CARD": {
      const { cardId, from, newText } = action.payload;
      return {
        ...state,
        [from]: state[from].map((card) => card.id === cardId ? { ...card, text: newText } : card )
      };
    }
    default:
      return state;
  }
}

export function KanbanProvider({ children }) {
  const [state, dispatch] = useReducer(kanbanReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return (
    <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>
  );
}

function TaskInput() {
  const { dispatch } = useContext(KanbanContext);
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    dispatch({ type: "ADD_TASK", payload: { text } });
    setText("");
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add New task...✍️" />
      <button type="submit">Add Task</button>
    </form>
  );
}

function Card({ card, from, setModalData }) {
  const { dispatch } = useContext(KanbanContext);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(card.text);

  const handleDoubleClick = () => setIsEditing(true);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      dispatch({ type: "EDIT_CARD", payload: { cardId: card.id, from, newText: editedText } });
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setEditedText(card.text);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    setEditedText(card.text);
    setIsEditing(false);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("card", JSON.stringify({ card, from }));
  };

  return (
    <div className="card" draggable={!isEditing} onDragStart={handleDragStart} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <input type="text" className="edit-input" autoFocus value={editedText} onChange={(e) => setEditedText(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleBlur} />
      ) : (
        card.text
      )}
    </div>
  );
}

function Column({ title, columnKey, setModalData }) {
  const { state, dispatch } = useContext(KanbanContext);
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;
    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      dispatch({ type: "MOVE_CARD", payload: { card: data.card, from: data.from, to: columnKey } });
    };
    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", handleDrop);
    return () => dropArea.removeEventListener("drop", handleDrop);
  }, [dispatch, columnKey]);

  return (
    <div className="column" ref={dropRef}>
      <h2>{title}</h2>
      {state[columnKey].map((card) => (
        <Card key={card.id} card={card} from={columnKey} setModalData={setModalData} />
      ))}
    </div>
  );
}

function TrashDropZone({ setModalData }) {
  const dropRef = useRef(null);

  useEffect(() => {
    const dropArea = dropRef.current;
    const handleDrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("card"));
      setModalData({ card: data.card, from: data.from });
    };
    dropArea.addEventListener("dragover", (e) => e.preventDefault());
    dropArea.addEventListener("drop", handleDrop);
    return () => dropArea.removeEventListener("drop", handleDrop);
  }, [setModalData]);

  return (<div className="trash-drop-zone" ref={dropRef}>🗑️ <span>Trash Bin</span></div>);
}

function KanbanBoard() {
  const { dispatch } = useContext(KanbanContext);
  const [modalData, setModalData] = useState(null);

  const handleConfirmDelete = () => {
    dispatch({ type: "DELETE_CARD", payload: { cardId: modalData.card.id, from: modalData.from } });
    setModalData(null);
  };

  return (
    <div className="board-container">
      <h1>Kanban To-Do</h1>
      <TaskInput />
      <TrashDropZone setModalData={setModalData} />
      <div className="board">
        <Column title="To Do" columnKey="todo" setModalData={setModalData} />
        <Column title="In Progress" columnKey="inProgress" setModalData={setModalData} />
        <Column title="Done" columnKey="done" setModalData={setModalData} />
      </div>
      {modalData && (
        <div className="modal">
          <div className="modal-content">
            <p>Are you sure you want to delete the: <strong>{modalData.card.text}</strong>?</p>
            <div className="modal-buttons">
              <button className="delete-btn" onClick={handleConfirmDelete}>Yes, Delete</button>
              <button className="cancel-btn" onClick={() => setModalData(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoardWrapper() {
  return (
    <KanbanProvider>
      <KanbanBoard />
    </KanbanProvider>);
}
