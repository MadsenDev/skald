import { useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreateFolderDialog({ isOpen, onClose, onCreate }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else {
      setName('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      // Sanitize folder name
      const sanitizedName = name.trim().replace(/[<>:"/\\|?*]/g, '_');
      onCreate(sanitizedName);
      setName('');
      onClose();
    }
  };

  const handleCancel = () => {
    setName('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Folder</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name
            </label>
            <input
              ref={inputRef}
              id="folder-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
              style={{ backgroundColor: 'white', color: '#111827' }}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

