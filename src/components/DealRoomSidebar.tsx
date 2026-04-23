'use client';

import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface CustomerStub {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  customerType: string;
}

interface GroupMember {
  id: string;
  customerId: string;
  customer: CustomerStub;
}

interface DealRoom {
  id: string;
  name: string;
  description: string | null;
  members: GroupMember[];
}

interface DealRoomSidebarProps {
  onDragStart?: (customerId: string) => void;
}

export default function DealRoomSidebar({ onDragStart }: DealRoomSidebarProps) {
  const { showToast } = useToast();
  const [dealRooms, setDealRooms] = useState<DealRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [dragOverRoom, setDragOverRoom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/deal-rooms')
      .then((r) => r.json())
      .then(setDealRooms)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (showInput) inputRef.current?.focus();
  }, [showInput]);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/deal-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (!res.ok) throw new Error();
      const room = await res.json();
      setDealRooms((prev) => [...prev, room]);
      setNewRoomName('');
      setShowInput(false);
      showToast('Group created', 'success');
    } catch {
      showToast('Failed to create group', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteRoom = async (id: string) => {
    try {
      const res = await fetch(`/api/deal-rooms/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDealRooms((prev) => prev.filter((r) => r.id !== id));
      showToast('Group deleted', 'success');
    } catch {
      showToast('Failed to delete group', 'error');
    }
  };

  const removeFromRoom = async (roomId: string, customerId: string) => {
    try {
      const res = await fetch(`/api/deal-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', customerId }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDealRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
    } catch {
      showToast('Failed to remove from group', 'error');
    }
  };

  const handleDrop = async (e: React.DragEvent, roomId: string) => {
    e.preventDefault();
    setDragOverRoom(null);
    const customerId = e.dataTransfer.getData('customerId');
    if (!customerId) return;

    try {
      const res = await fetch(`/api/deal-rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', customerId }),
      });
      if (res.status === 409) {
        showToast('Person already in this group', 'error');
        return;
      }
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDealRooms((prev) => prev.map((r) => (r.id === roomId ? updated : r)));
      showToast('Added to group', 'success');
    } catch {
      showToast('Failed to add to group', 'error');
    }
  };

  return (
    <aside className="deal-room-sidebar">
      <div className="deal-room-sidebar-header">
        <span className="deal-room-sidebar-title">Groups</span>
        <button
          className="deal-room-add-btn"
          onClick={() => setShowInput((v) => !v)}
          title="New group"
        >
          +
        </button>
      </div>

      {showInput && (
        <div className="deal-room-new-input">
          <input
            ref={inputRef}
            className="form-input"
            placeholder="Room name..."
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createRoom();
              if (e.key === 'Escape') { setShowInput(false); setNewRoomName(''); }
            }}
            style={{ fontSize: '0.8rem', padding: '0.375rem 0.625rem' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={createRoom}
            disabled={creating || !newRoomName.trim()}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
          >
            {creating ? '...' : 'Create'}
          </button>
        </div>
      )}

      <div className="deal-room-list">
        {dealRooms.length === 0 && !showInput && (
          <p className="deal-room-empty">Drag people here to create a group</p>
        )}

        {dealRooms.map((room) => (
          <div
            key={room.id}
            className={`deal-room-card${dragOverRoom === room.id ? ' deal-room-card-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverRoom(room.id); }}
            onDragLeave={() => setDragOverRoom(null)}
            onDrop={(e) => handleDrop(e, room.id)}
          >
            <div className="deal-room-card-header">
              <span className="deal-room-card-name">{room.name}</span>
              <button
                className="deal-room-delete-btn"
                onClick={() => deleteRoom(room.id)}
                title="Delete room"
              >
                ×
              </button>
            </div>

            <div className="deal-room-members">
              {room.members.length === 0 && (
                <p className="deal-room-drop-hint">Drop people here</p>
              )}
              {room.members.map((rc) => (
                <div key={rc.id} className="deal-room-member">
                  <div className="deal-room-member-avatar">
                    {rc.customer.logoUrl ? (
                      <img src={`/api/files/${rc.customer.logoUrl}`} alt="" />
                    ) : (
                      rc.customer.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="deal-room-member-info">
                    <a href={`/customers/${rc.customer.id}`} className="deal-room-member-name">
                      {rc.customer.name}
                    </a>
                    {rc.customer.companyName && (
                      <span className="deal-room-member-company">{rc.customer.companyName}</span>
                    )}
                  </div>
                  <button
                    className="deal-room-remove-btn"
                    onClick={() => removeFromRoom(room.id, rc.customer.id)}
                    title="Remove from room"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
