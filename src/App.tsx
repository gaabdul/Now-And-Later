import { useState, useEffect, useRef } from 'react'
import './App.css'
import { AuthButton, SignInModal } from './components/AuthUI'
import { useAuth } from './contexts/AuthContext'

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
  order: number;
  dueDate?: string | null;
  reminderAt?: string | null;
  tags: string[];
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface TaskFormData {
  title: string;
  dueDate: string;
  reminderAt?: string;
  tags: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface SearchResult {
  task: Task;
  boardName: string;
  quadrantName: string;
  isArchived: boolean;
}


type ThemeMode = 'light' | 'dark';
type AccentColor = 'blue' | 'green' | 'purple';

interface Theme {
  mode: ThemeMode;
  accent: AccentColor;
}

function App() {
  const { loading, isGuest, setGuestMode } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [key: string]: TaskFormData }>({});
  const [errorMessages, setErrorMessages] = useState<{ [key: string]: string }>({});
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [deleteConfirmBoardId, setDeleteConfirmBoardId] = useState<string | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Archive state
  const [showArchive, setShowArchive] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<Theme>({ mode: 'light', accent: 'blue' });
  
  // Sign-in modal state
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const quadrants = [
    { id: 'Q1', name: 'Urgent & Important', action: 'Do now' },
    { id: 'Q2', name: 'Not Urgent & Important', action: 'Schedule' },
    { id: 'Q3', name: 'Urgent & Not Important', action: 'Delegate' },
    { id: 'Q4', name: 'Not Urgent & Not Important', action: 'Eliminate' }
  ];

  // Load boards, active board, tasks, and theme from localStorage on component mount
  useEffect(() => {
    const savedBoards = localStorage.getItem('eisenhower-boards');
    const savedActiveBoard = localStorage.getItem('eisenhower-active-board');
    const savedTasks = localStorage.getItem('eisenhower-tasks');
    const savedTheme = localStorage.getItem('eisenhower-theme');
    
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
        // Ensure all tasks have required fields
        const tasksWithDefaults = parsedTasks.map((task: Task, index: number) => ({
          ...task,
          order: task.order || index,
          tags: task.tags || [],
          dueDate: task.dueDate || null,
          reminderAt: task.reminderAt || null,
          recurrence: task.recurrence || 'none'
        }));
        setTasks(tasksWithDefaults);
      } catch (error) {
        console.warn('Failed to parse saved tasks, starting with empty tasks');
        setTasks([]);
      }
    }

    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
      } catch (error) {
        console.warn('Failed to parse saved theme, using default');
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

  // Save theme
  useEffect(() => {
    try {
      localStorage.setItem('eisenhower-theme', JSON.stringify(theme));
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }, [theme]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminderAt && !task.completed) {
          const reminderTime = new Date(task.reminderAt);
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) { // Within last minute
            showNotification(task);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [tasks, notificationPermission]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];
      
      tasks.forEach(task => {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (matchesTitle || matchesTags) {
          const board = boards.find(b => b.id === task.boardId);
          const quadrant = quadrants.find(q => q.id === task.quadrantId);
          results.push({
            task,
            boardName: board?.name || 'Unknown Board',
            quadrantName: quadrant?.name || task.quadrantId,
            isArchived: task.completed
          });
        }
      });
      
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, tasks, boards]);

  // Click outside search results to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (task: Task) => {
    if (notificationPermission === 'granted') {
      const board = boards.find(b => b.id === task.boardId);
      const quadrant = quadrants.find(q => q.id === task.quadrantId);
      
      new Notification('Task Reminder', {
        body: `${task.title}\nBoard: ${board?.name || 'Unknown'}\nQuadrant: ${quadrant?.name || task.quadrantId}`,
        icon: '/favicon.ico',
        tag: task.id,
        requireInteraction: true
      });
    }
  };

  const createNewBoard = async () => {
    const boardName = prompt('Enter board name:');
    if (boardName && boardName.trim()) {
      const newBoard: Board = {
        id: (boards.length + 1).toString(),
        name: boardName.trim()
      };
      setBoards(prev => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
    }
  };

  const getTasksForQuadrant = (quadrantId: string) => {
    return tasks
      .filter(task => task.boardId === activeBoardId && task.quadrantId === quadrantId && !task.completed)
      .sort((a, b) => a.order - b.order);
  };





  const addTask = async (quadrantId: string) => {
    const formData = newTaskInputs[quadrantId];
    if (!formData || !formData.title.trim()) return;

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    try {
      const newTask: Task = {
        id: Date.now().toString(), // Simple ID generation
        boardId: activeBoardId,
        quadrantId,
        title: formData.title.trim(),
        createdAt: Date.now(),
        completed: false,
        order: getTasksForQuadrant(quadrantId).length,
        dueDate: formData.dueDate || null,
        reminderAt: formData.reminderAt || null,
        tags,
        recurrence: formData.recurrence || 'none'
      };
      setTasks(prev => [...prev, newTask]);

      // Clear the form
      const { [quadrantId]: removed, ...rest } = newTaskInputs;
      setNewTaskInputs(rest);
      setShowTaskForm(null);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const updateTask = async (taskId: string, formData: TaskFormData) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    try {
      const updatedTask = {
        ...tasks[taskIndex],
        title: formData.title.trim(),
        dueDate: formData.dueDate || null,
        reminderAt: formData.reminderAt || null,
        tags,
        recurrence: formData.recurrence || 'none'
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));

      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const completeTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      const updatedTask = {
        ...tasks[taskIndex],
        completed: true,
        completedAt: Date.now()
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));

      // Handle recurrence
      if (tasks[taskIndex].recurrence !== 'none' && tasks[taskIndex].dueDate) {
        const currentDueDate = new Date(tasks[taskIndex].dueDate);
        let nextDueDate = new Date(currentDueDate);
        
        switch (tasks[taskIndex].recurrence) {
          case 'daily':
            nextDueDate.setDate(currentDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(currentDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(currentDueDate.getMonth() + 1);
            break;
        }

        const nextTask: Task = {
          id: Date.now().toString(), // Simple ID generation
          boardId: tasks[taskIndex].boardId,
          quadrantId: tasks[taskIndex].quadrantId,
          title: tasks[taskIndex].title,
          createdAt: Date.now(),
          completed: false,
          order: getTasksForQuadrant(tasks[taskIndex].quadrantId).length,
          dueDate: nextDueDate.toISOString().split('T')[0],
          reminderAt: tasks[taskIndex].reminderAt,
          tags: tasks[taskIndex].tags,
          recurrence: tasks[taskIndex].recurrence,
        };

        setTasks(prev => [...prev, nextTask]);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString();
  };

  const getThemeClass = () => {
    return `theme-${theme.mode} accent-${theme.accent}`;
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // Scroll to the task in the UI
    const taskElement = document.querySelector(`[data-task-id="${result.task.id}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the task briefly
      taskElement.classList.add('highlight');
      setTimeout(() => taskElement.classList.remove('highlight'), 2000);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && due.toDateString() !== today.toDateString();
  };

  const deleteBoard = async (boardId: string) => {
    try {
      // Delete all tasks associated with this board
      const updatedTasks = tasks.filter(task => task.boardId !== boardId);
      setTasks(updatedTasks);
      
      // Remove the board
      const updatedBoards = boards.filter(board => board.id !== boardId);
      setBoards(updatedBoards);
      
      // If the deleted board was active, switch to the first available board
      if (activeBoardId === boardId) {
        if (updatedBoards.length > 0) {
          setActiveBoardId(updatedBoards[0].id);
        } else {
          // Create a new default board if no boards remain
          const defaultBoard: Board = { id: '1', name: 'My Matrix' };
          setBoards([defaultBoard]);
          setActiveBoardId(defaultBoard.id);
        }
      }
      
      setDeleteConfirmBoardId(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      setTasks(prev => prev.filter((_, index) => index !== taskIndex));
      setDeleteConfirmTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const getCompletedTasks = () => {
    return tasks
      .filter(task => task.boardId === activeBoardId && task.completed)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  };

  const restoreTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      const updatedTask = {
        ...tasks[taskIndex],
        completed: false,
        completedAt: undefined
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));
    } catch (error) {
      console.error('Error restoring task:', error);
      alert('Failed to restore task. Please try again.');
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setErrorMessages({});
    setShowTaskForm(null);
  };

  // Global keyboard event handler for A key
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle A key when not typing in an input field
      if (event.key === 'a' || event.key === 'A') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        event.preventDefault();
        
        // Find the first quadrant and open add task form
        if (!showTaskForm) {
          setShowTaskForm('Q1');
          setNewTaskInputs(prev => ({ 
            ...prev, 
            'Q1': { title: '', dueDate: '', reminderAt: '', tags: '', recurrence: 'none' } 
          }));
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showTaskForm]);

  // Show login flow for first-time users
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <h1>Eisenhower Matrix</h1>
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login flow for guests
  if (isGuest) {
    return (
      <div className="app welcome-screen">
        <div className="welcome-content">
          <h1>Welcome to Matrix</h1>
          <p className="welcome-subtitle">
            Organize tasks by urgency and importance.
          </p>
          
          <div className="auth-options">
            <button 
              className="auth-option-btn primary"
              onClick={() => {
                setGuestMode(true);
              }}
            >
              Continue as Guest
            </button>
            <button 
              className="auth-option-btn secondary"
              onClick={() => {
                // Show the sign-in modal directly
                setShowSignInModal(true);
              }}
            >
              Sign in with Email
            </button>
          </div>
        </div>
        
        {/* Sign-in Modal */}
        <SignInModal 
          isOpen={showSignInModal} 
          onClose={() => setShowSignInModal(false)} 
        />
      </div>
    );
  }

  return (
    <div className={`app ${getThemeClass()}`}>
      <header className="header">
        <h1>Eisenhower Matrix</h1>
        
        {/* Simple Header Controls */}
        <div className="header-controls">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div ref={searchResultsRef} className="search-results">
                {searchResults.map((result) => (
                  <div
                    key={result.task.id}
                    className="search-result"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="search-result-title">{result.task.title}</div>
                    <div className="search-result-meta">
                      <span className="search-result-board">{result.boardName}</span>
                      <span className="search-result-location">
                        {result.isArchived ? 'Archive' : result.quadrantName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Archive Toggle */}
          <button 
            className={`archive-btn ${showArchive ? 'active' : ''}`}
            onClick={() => setShowArchive(!showArchive)}
          >
            {showArchive ? '← Back to Matrix' : '📁 Archive'}
          </button>

          {/* User Profile */}
          <div className="user-profile">
            <AuthButton />
          </div>
        </div>
      </header>
      
      <div className="board-switcher">
        <div className="board-list">
          {boards.map(board => (
            <div key={board.id} className={`board-chip-container ${board.id === activeBoardId ? 'active' : ''}`}>
              <button
                className={`board-chip ${board.id === activeBoardId ? 'active' : ''}`}
                onClick={() => setActiveBoardId(board.id)}
              >
                {board.name}
              </button>
              {boards.length > 1 && (
                <button
                  className="board-delete-btn"
                  onClick={() => setDeleteConfirmBoardId(board.id)}
                  title="Delete board"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="new-board-btn" onClick={createNewBoard}>
          + New Board
        </button>
      </div>

      {/* Board Delete Confirmation */}
      {deleteConfirmBoardId && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            <h3>Delete Board</h3>
            <p>
              Are you sure you want to delete "{boards.find(b => b.id === deleteConfirmBoardId)?.name}"? 
              This will permanently delete all tasks in this board.
            </p>
            <div className="delete-modal-actions">
              <button 
                className="btn-danger"
                onClick={() => deleteBoard(deleteConfirmBoardId)}
              >
                Delete Board
              </button>
              <button 
                className="btn-secondary"
                onClick={() => setDeleteConfirmBoardId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {!showArchive && (
        <main className="matrix-container">
          <div className="matrix">
            {quadrants.map(quadrant => {
            const quadrantTasks = getTasksForQuadrant(quadrant.id);
            const isAddingTask = showTaskForm === quadrant.id;
            
            return (
              <div 
                key={quadrant.id} 
                className={`quadrant ${quadrant.id.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <h2>{quadrant.name}</h2>
                <p>{quadrant.action}</p>
                
                <div className="task-list">
                  {quadrantTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="task-item" 
                      data-task-id={task.id}
                    >
                      <div className="task-content">
                        <button 
                          className="complete-btn"
                          onClick={() => completeTask(task.id)}
                          title="Mark as complete"
                        >
                          <svg className="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        </button>
                        {editingTaskId === task.id ? (
                          <div className="task-edit">
                            <input
                              type="text"
                              value={newTaskInputs[task.id]?.title || task.title}
                              onChange={(e) => setNewTaskInputs(prev => ({ 
                                ...prev, 
                                [task.id]: { 
                                  ...prev[task.id], 
                                  title: e.target.value 
                                } 
                              }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  updateTask(task.id, newTaskInputs[task.id] || { title: task.title, dueDate: '', reminderAt: '', tags: '' });
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  cancelEdit();
                                }
                              }}
                              onBlur={() => updateTask(task.id, newTaskInputs[task.id] || { title: task.title, dueDate: '', reminderAt: '', tags: '' })}
                              autoFocus
                              className="task-input"
                            />
                            {errorMessages[task.id] && (
                              <div className="error-message">{errorMessages[task.id]}</div>
                            )}
                          </div>
                        ) : (
                          <div className="task-info">
                            <div 
                              className="task-title"
                              onClick={() => {
                                setEditingTaskId(task.id);
                                setNewTaskInputs(prev => ({ 
                                  ...prev, 
                                  [task.id]: { 
                                    title: task.title, 
                                    dueDate: task.dueDate || '', 
                                    reminderAt: task.reminderAt || '', 
                                    tags: task.tags.join(', '),
                                    recurrence: task.recurrence || 'none'
                                  } 
                                }));
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Edit task: ${task.title}`}
                            >
                              {task.title}
                            </div>
                            <div className="task-meta">
                              {task.dueDate && (
                                <div className={`task-due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                                  {isOverdue(task.dueDate) && (
                                    <svg className="icon warning-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                      <line x1="12" y1="9" x2="12" y2="13"/>
                                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                                    </svg>
                                  )}
                                  <svg className="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                  {formatDueDate(task.dueDate)}
                                </div>
                              )}
                              {task.recurrence !== 'none' && (
                                <div className="task-recurrence" title={`Repeats ${task.recurrence}`}>
                                  <svg className="icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="23,4 23,10 17,10"/>
                                    <polyline points="1,20 1,14 7,14"/>
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                                  </svg>
                                </div>
                              )}
                            </div>
                            {task.tags.length > 0 && (
                              <div className="task-tags">
                                {task.tags.map(tag => (
                                  <span 
                                    key={tag} 
                                    className="task-tag"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                                                     </div>
                         )}
                         <button 
                           className="task-delete-btn"
                           onClick={() => setDeleteConfirmTaskId(task.id)}
                           title="Delete task"
                         >
                           ×
                         </button>
                       </div>
                       
                       {/* Task Delete Confirmation */}
                       {deleteConfirmTaskId === task.id && (
                         <div className="task-delete-confirmation">
                           <p>Delete "{task.title}"?</p>
                           <div className="task-delete-actions">
                             <button 
                               className="btn-danger-small"
                               onClick={() => deleteTask(task.id)}
                             >
                               Delete
                             </button>
                             <button 
                               className="btn-secondary-small"
                               onClick={() => setDeleteConfirmTaskId(null)}
                             >
                               Cancel
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                  ))}
                  
                  {isAddingTask ? (
                    <div className="task-form">
                      <input
                        type="text"
                        value={newTaskInputs[quadrant.id]?.title || ''}
                        onChange={(e) => setNewTaskInputs(prev => ({ 
                          ...prev, 
                          [quadrant.id]: { 
                            ...prev[quadrant.id], 
                            title: e.target.value 
                          } 
                        }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTask(quadrant.id);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowTaskForm(null);
                            const { [quadrant.id]: removed, ...rest } = newTaskInputs;
                            setNewTaskInputs(rest);
                          }
                        }}
                        placeholder="Task title..."
                        className="task-input"
                        autoFocus
                      />
                      
                      <div className="task-form-row">
                        <input
                          type="date"
                          value={newTaskInputs[quadrant.id]?.dueDate || ''}
                          onChange={(e) => setNewTaskInputs(prev => ({ 
                            ...prev, 
                            [quadrant.id]: { 
                              ...prev[quadrant.id], 
                              dueDate: e.target.value 
                            } 
                          }))}
                          className="task-date-input"
                          placeholder="Due date"
                        />
                      </div>
                      
                      <div className="task-form-row">
                        <input
                          type="text"
                          value={newTaskInputs[quadrant.id]?.tags || ''}
                          onChange={(e) => setNewTaskInputs(prev => ({ 
                            ...prev, 
                            [quadrant.id]: { 
                              ...prev[quadrant.id], 
                              tags: e.target.value 
                            } 
                          }))}
                          placeholder="Tags (comma-separated)..."
                          className="task-tags-input"
                        />
                      </div>
                      
                      <div className="task-form-actions">
                        <button 
                          className="save-task-btn"
                          onClick={() => addTask(quadrant.id)}
                        >
                          Save
                        </button>
                        <button 
                          className="cancel-task-btn"
                          onClick={() => {
                            setShowTaskForm(null);
                            const { [quadrant.id]: removed, ...rest } = newTaskInputs;
                            setNewTaskInputs(rest);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                      {errorMessages[quadrant.id] && (
                        <div className="error-message">{errorMessages[quadrant.id]}</div>
                      )}
                    </div>
                  ) : (
                    <button 
                      className="add-task-btn"
                      onClick={() => {
                        setShowTaskForm(quadrant.id);
                        setNewTaskInputs(prev => ({ 
                          ...prev, 
                          [quadrant.id]: { title: '', dueDate: '', tags: '', recurrence: 'none' } 
                        }));
                      }}
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
      )}

      {/* Archive View */}
      {showArchive && (
        <main className="archive-container">
          <div className="archive-header">
            <h2>Completed Tasks</h2>
            <p>{getCompletedTasks().length} completed task{getCompletedTasks().length !== 1 ? 's' : ''}</p>
          </div>
          
          {getCompletedTasks().length === 0 ? (
            <div className="archive-empty">
              <p>No completed tasks yet</p>
              <p>Complete some tasks to see them here</p>
            </div>
          ) : (
            <div className="archive-list">
              {getCompletedTasks().map(task => (
                <div key={task.id} className="archive-item">
                  <div className="archive-task-info">
                    <div className="archive-task-title">{task.title}</div>
                    <div className="archive-task-meta">
                      <span className="archive-time">
                        {task.completedAt && new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {task.tags.length > 0 && (
                      <div className="archive-task-tags">
                        {task.tags.map(tag => (
                          <span key={tag} className="archive-task-tag">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="archive-actions">
                    <button 
                      className="btn-secondary-small"
                      onClick={() => restoreTask(task.id)}
                      title="Restore task"
                    >
                      ↶ Restore
                    </button>
                    <button 
                      className="btn-danger-small"
                      onClick={() => setDeleteConfirmTaskId(task.id)}
                      title="Delete permanently"
                    >
                      Delete
                    </button>
                  </div>
                  
                  {/* Delete Confirmation for Archive */}
                  {deleteConfirmTaskId === task.id && (
                    <div className="task-delete-confirmation">
                      <p>Delete "{task.title}" permanently?</p>
                      <div className="task-delete-actions">
                        <button 
                          className="btn-danger-small"
                          onClick={() => deleteTask(task.id)}
                        >
                          Delete
                        </button>
                        <button 
                          className="btn-secondary-small"
                          onClick={() => setDeleteConfirmTaskId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Sign-in modal */}
      {showSignInModal && (
        <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />
      )}
    </div>
  )
}

export default App
