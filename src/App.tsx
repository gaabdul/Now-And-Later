import { useState, useEffect } from 'react'
import './App.css'

interface Board {
  id: string;
  name: string;
}

interface Task {
  id: string;
  boardId: string;
  quadrantId: string;
  title: string;
  createdAt: number;
  completed: boolean;
  completedAt?: number;
  order: number; // New field for ordering within quadrant
}

interface DragState {
  taskId: string | null;
  sourceQuadrant: string | null;
  isDragging: boolean;
}

interface KeyboardMoveState {
  taskId: string | null;
  isOpen: boolean;
}

function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [key: string]: string }>({});
  const [errorMessages, setErrorMessages] = useState<{ [key: string]: string }>({});
  const [showArchive, setShowArchive] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    sourceQuadrant: null,
    isDragging: false
  });
  const [keyboardMoveState, setKeyboardMoveState] = useState<KeyboardMoveState>({
    taskId: null,
    isOpen: false
  });
  const [dragOverQuadrant, setDragOverQuadrant] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const quadrants = [
    { id: 'Q1', name: 'Urgent & Important', action: 'Do now' },
    { id: 'Q2', name: 'Not Urgent & Important', action: 'Schedule' },
    { id: 'Q3', name: 'Urgent & Not Important', action: 'Delegate' },
    { id: 'Q4', name: 'Not Urgent & Not Important', action: 'Eliminate' }
  ];

  // Load boards, active board, and tasks from localStorage on component mount
  useEffect(() => {
    const savedBoards = localStorage.getItem('eisenhower-boards');
    const savedActiveBoard = localStorage.getItem('eisenhower-active-board');
    const savedTasks = localStorage.getItem('eisenhower-tasks');
    
    if (savedBoards) {
      const parsedBoards = JSON.parse(savedBoards);
      setBoards(parsedBoards);
      
      if (savedActiveBoard && parsedBoards.find((b: Board) => b.id === savedActiveBoard)) {
        setActiveBoardId(savedActiveBoard);
      } else if (parsedBoards.length > 0) {
        setActiveBoardId(parsedBoards[0].id);
      }
    } else {
      // Create default board if no boards exist
      const defaultBoard: Board = { id: '1', name: 'My Matrix' };
      setBoards([defaultBoard]);
      setActiveBoardId(defaultBoard.id);
    }

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // Ensure all tasks have order field
        const tasksWithOrder = parsedTasks.map((task: Task, index: number) => ({
          ...task,
          order: task.order || index
        }));
        setTasks(tasksWithOrder);
      } catch (error) {
        console.warn('Failed to parse saved tasks, starting with empty tasks');
        setTasks([]);
      }
    }
  }, []);

  // Save boards, active board, and tasks to localStorage whenever they change
  useEffect(() => {
    if (boards.length > 0) {
      try {
        localStorage.setItem('eisenhower-boards', JSON.stringify(boards));
        localStorage.setItem('eisenhower-active-board', activeBoardId);
      } catch (error) {
        console.warn('Failed to save boards to localStorage:', error);
      }
    }
  }, [boards, activeBoardId]);

  useEffect(() => {
    try {
      localStorage.setItem('eisenhower-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.warn('Failed to save tasks to localStorage:', error);
    }
  }, [tasks]);

  const createNewBoard = () => {
    const boardName = prompt('Enter board name:');
    if (boardName && boardName.trim()) {
      const newBoard: Board = {
        id: Date.now().toString(),
        name: boardName.trim()
      };
      setBoards([...boards, newBoard]);
      setActiveBoardId(newBoard.id);
    }
  };

  const getTasksForQuadrant = (quadrantId: string) => {
    return tasks
      .filter(task => 
        task.boardId === activeBoardId && 
        task.quadrantId === quadrantId && 
        !task.completed
      )
      .sort((a, b) => a.order - b.order);
  };

  const getCompletedTasks = () => {
    return tasks.filter(task => 
      task.boardId === activeBoardId && 
      task.completed
    ).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  };

  const getNextOrder = (quadrantId: string) => {
    const quadrantTasks = getTasksForQuadrant(quadrantId);
    return quadrantTasks.length > 0 ? Math.max(...quadrantTasks.map(t => t.order)) + 1 : 0;
  };

  const addTask = (quadrantId: string) => {
    const title = newTaskInputs[quadrantId]?.trim();
    
    if (!title) {
      setErrorMessages(prev => ({ ...prev, [quadrantId]: 'Task title is required' }));
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      boardId: activeBoardId,
      quadrantId,
      title,
      createdAt: Date.now(),
      completed: false,
      order: getNextOrder(quadrantId)
    };

    setTasks([...tasks, newTask]);
    setNewTaskInputs(prev => ({ ...prev, [quadrantId]: '' }));
    setErrorMessages(prev => ({ ...prev, [quadrantId]: '' }));
  };

  const updateTask = (taskId: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim();
    
    if (!trimmedTitle) {
      setErrorMessages(prev => ({ ...prev, [taskId]: 'Task title is required' }));
      return;
    }

    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, title: trimmedTitle } : task
    ));
    setEditingTaskId(null);
    setErrorMessages(prev => ({ ...prev, [taskId]: '' }));
  };

  const completeTask = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { 
        ...task, 
        completed: true, 
        completedAt: Date.now() 
      } : task
    ));
  };

  const restoreTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        completed: false,
        completedAt: undefined,
        order: getNextOrder(task.quadrantId)
      } : t
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, taskId: string, quadrantId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDragState({
      taskId,
      sourceQuadrant: quadrantId,
      isDragging: true
    });
  };

  const handleDragOver = (e: React.DragEvent, quadrantId: string, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQuadrant(quadrantId);
    setDragOverIndex(index !== undefined ? index : null);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrantId: string, targetIndex?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !dragState.taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const targetQuadrantTasks = getTasksForQuadrant(targetQuadrantId);
    
    let newOrder: number;
    
    if (targetIndex !== undefined) {
      // Insert at specific position
      if (targetIndex >= targetQuadrantTasks.length) {
        newOrder = getNextOrder(targetQuadrantId);
      } else {
        const targetTask = targetQuadrantTasks[targetIndex];
        newOrder = targetTask.order;
      }
    } else {
      // Add to end
      newOrder = getNextOrder(targetQuadrantId);
    }

    // Reorder tasks in target quadrant
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, quadrantId: targetQuadrantId, order: newOrder };
      }
      if (t.quadrantId === targetQuadrantId && !t.completed && t.boardId === activeBoardId) {
        if (targetIndex !== undefined && t.order >= newOrder) {
          return { ...t, order: t.order + 1 };
        }
      }
      return t;
    });

    // Reorder tasks in source quadrant
    const finalTasks = updatedTasks.map(t => {
      if (t.quadrantId === dragState.sourceQuadrant && !t.completed && t.boardId === activeBoardId) {
        const sourceTasks = updatedTasks.filter(task => 
          task.quadrantId === dragState.sourceQuadrant && 
          !task.completed && 
          task.boardId === activeBoardId &&
          task.id !== taskId
        ).sort((a, b) => a.order - b.order);
        
        const sourceIndex = sourceTasks.findIndex(task => task.id === t.id);
        if (sourceIndex !== -1) {
          return { ...t, order: sourceIndex };
        }
      }
      return t;
    });

    setTasks(finalTasks);
    setDragState({ taskId: null, sourceQuadrant: null, isDragging: false });
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  // Keyboard Move Functions
  const handleKeyboardMove = (taskId: string, targetQuadrantId: string, direction?: 'up' | 'down') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (direction) {
      // Move up/down within same quadrant
      const quadrantTasks = getTasksForQuadrant(task.quadrantId);
      const currentIndex = quadrantTasks.findIndex(t => t.id === taskId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex >= 0 && targetIndex < quadrantTasks.length) {
        const targetTask = quadrantTasks[targetIndex];
        setTasks(tasks.map(t => {
          if (t.id === taskId) return { ...t, order: targetTask.order };
          if (t.id === targetTask.id) return { ...t, order: task.order };
          return t;
        }));
      }
    } else {
      // Move to different quadrant
      const newOrder = getNextOrder(targetQuadrantId);
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, quadrantId: targetQuadrantId, order: newOrder };
        }
        return t;
      }));
    }
    
    setKeyboardMoveState({ taskId: null, isOpen: false });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setErrorMessages({});
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      setKeyboardMoveState({ taskId: null, isOpen: false });
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getQuadrantName = (quadrantId: string) => {
    const quadrant = quadrants.find(q => q.id === quadrantId);
    return quadrant ? quadrant.name : quadrantId;
  };

  const activeBoard = boards.find(board => board.id === activeBoardId);
  const completedTasks = getCompletedTasks();

  // Group completed tasks by date
  const groupedCompletedTasks = completedTasks.reduce((groups, task) => {
    const date = new Date(task.completedAt || 0).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(task);
    return groups;
  }, {} as { [key: string]: Task[] });

  return (
    <div className="app">
      <header className="header">
        <h1>Eisenhower Matrix</h1>
        <button 
          className={`archive-btn ${showArchive ? 'active' : ''}`}
          onClick={() => setShowArchive(!showArchive)}
        >
          {showArchive ? '← Back to Matrix' : '📁 Archive'}
        </button>
      </header>
      
      {!showArchive && (
        <>
          <div className="board-switcher">
            <div className="board-list">
              {boards.map(board => (
                <button
                  key={board.id}
                  className={`board-chip ${board.id === activeBoardId ? 'active' : ''}`}
                  onClick={() => setActiveBoardId(board.id)}
                >
                  {board.name}
                </button>
              ))}
            </div>
            <button className="new-board-btn" onClick={createNewBoard}>
              + New Board
            </button>
          </div>

          <main className="matrix-container">
            <div className="matrix">
              {quadrants.map(quadrant => {
                const quadrantTasks = getTasksForQuadrant(quadrant.id);
                const isAddingTask = newTaskInputs[quadrant.id] !== undefined;
                const isDragOver = dragOverQuadrant === quadrant.id;
                
                return (
                  <div 
                    key={quadrant.id} 
                    className={`quadrant ${quadrant.id.toLowerCase().replace(/\s+/g, '-')} ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, quadrant.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, quadrant.id)}
                  >
                    <h2>{quadrant.name}</h2>
                    <p>{quadrant.action}</p>
                    
                    <div className="task-list">
                      {quadrantTasks.map((task, index) => (
                        <div key={task.id} className="task-item">
                          <div className="task-content">
                            <button 
                              className="complete-btn"
                              onClick={() => completeTask(task.id)}
                              title="Mark as complete"
                            >
                              ✓
                            </button>
                            <div 
                              className="task-drag-handle"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id, quadrant.id)}
                              title="Drag to move or reorder"
                            >
                              ⋮⋮
                            </div>
                            {editingTaskId === task.id ? (
                              <div className="task-edit">
                                <input
                                  type="text"
                                  value={newTaskInputs[task.id] || task.title}
                                  onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  onKeyPress={(e) => handleKeyPress(e, () => updateTask(task.id, newTaskInputs[task.id] || task.title))}
                                  onKeyDown={handleKeyDown}
                                  onBlur={() => updateTask(task.id, newTaskInputs[task.id] || task.title)}
                                  autoFocus
                                  className="task-input"
                                />
                                {errorMessages[task.id] && (
                                  <div className="error-message">{errorMessages[task.id]}</div>
                                )}
                              </div>
                            ) : (
                              <div 
                                className="task-title"
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setNewTaskInputs(prev => ({ ...prev, [task.id]: task.title }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setKeyboardMoveState({ taskId: task.id, isOpen: true });
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`Edit task: ${task.title}`}
                              >
                                {task.title}
                              </div>
                            )}
                          </div>
                          
                          {/* Keyboard Move Menu */}
                          {keyboardMoveState.taskId === task.id && keyboardMoveState.isOpen && (
                            <div className="keyboard-move-menu">
                              <div className="move-section">
                                <h4>Move to:</h4>
                                {quadrants.map(q => (
                                  <button
                                    key={q.id}
                                    onClick={() => handleKeyboardMove(task.id, q.id)}
                                    className={q.id === quadrant.id ? 'current' : ''}
                                  >
                                    {q.name}
                                  </button>
                                ))}
                              </div>
                              <div className="move-section">
                                <h4>Reorder:</h4>
                                <button onClick={() => handleKeyboardMove(task.id, quadrant.id, 'up')}>
                                  ↑ Move Up
                                </button>
                                <button onClick={() => handleKeyboardMove(task.id, quadrant.id, 'down')}>
                                  ↓ Move Down
                                </button>
                              </div>
                              <button 
                                className="close-menu"
                                onClick={() => setKeyboardMoveState({ taskId: null, isOpen: false })}
                              >
                                ✕ Close
                              </button>
                            </div>
                          )}
                          
                          {/* Drop indicator */}
                          {isDragOver && dragOverIndex === index && (
                            <div className="drop-indicator" />
                          )}
                        </div>
                      ))}
                      
                      {/* Drop indicator at end */}
                      {isDragOver && dragOverIndex === quadrantTasks.length && (
                        <div className="drop-indicator" />
                      )}
                      
                      {isAddingTask ? (
                        <div className="task-edit">
                          <input
                            type="text"
                            value={newTaskInputs[quadrant.id] || ''}
                            onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [quadrant.id]: e.target.value }))}
                            onKeyPress={(e) => handleKeyPress(e, () => addTask(quadrant.id))}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                              if (newTaskInputs[quadrant.id]?.trim()) {
                                addTask(quadrant.id);
                              } else {
                                const { [quadrant.id]: removed, ...rest } = newTaskInputs;
                                setNewTaskInputs(rest);
                                setErrorMessages(prev => ({ ...prev, [quadrant.id]: '' }));
                              }
                            }}
                            placeholder="Enter task title..."
                            autoFocus
                            className="task-input"
                          />
                          {errorMessages[quadrant.id] && (
                            <div className="error-message">{errorMessages[quadrant.id]}</div>
                          )}
                        </div>
                      ) : (
                        <button 
                          className="add-task-btn"
                          onClick={() => setNewTaskInputs(prev => ({ ...prev, [quadrant.id]: '' }))}
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                    
                    {quadrantTasks.length === 0 && !isAddingTask && (
                      <div className="empty-state">
                        <p>No tasks yet</p>
                        <p>Click "Add Task" to get started</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}

      {showArchive && (
        <main className="archive-container">
          <div className="archive-header">
            <h2>Archive - {activeBoard?.name}</h2>
            <p>{completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}</p>
          </div>
          
          {completedTasks.length === 0 ? (
            <div className="archive-empty">
              <p>No completed tasks yet</p>
              <p>Complete some tasks to see them here</p>
            </div>
          ) : (
            <div className="archive-list">
              {Object.entries(groupedCompletedTasks).map(([date, tasks]) => (
                <div key={date} className="archive-group">
                  <h3 className="archive-date">{date}</h3>
                  {tasks.map(task => (
                    <div key={task.id} className="archive-item">
                      <div className="archive-task-info">
                        <div className="archive-task-title">{task.title}</div>
                        <div className="archive-task-meta">
                          <span className="archive-quadrant">{getQuadrantName(task.quadrantId)}</span>
                          <span className="archive-time">{formatDate(task.completedAt || 0)}</span>
                        </div>
                      </div>
                      <div className="archive-actions">
                        <button 
                          className="restore-btn"
                          onClick={() => restoreTask(task.id)}
                          title="Restore to original quadrant"
                        >
                          ↶ Restore
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => deleteTask(task.id)}
                          title="Delete permanently"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  )
}

export default App
