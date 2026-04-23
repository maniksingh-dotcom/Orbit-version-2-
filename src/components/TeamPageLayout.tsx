'use client';

import { useState, useEffect } from 'react';
import TeamBoard from './TeamBoard';
import DealRoomChat from './DealRoomChat';

interface CustomerInfo {
  id: string;
  name: string;
  logoUrl: string | null;
  _count: { teamNotes: number };
}

interface GroupMember {
  id: string;
  customer: { id: string; name: string; companyName: string | null };
}

interface DealRoom {
  id: string;
  name: string;
  members: GroupMember[];
}

interface Props {
  customers: CustomerInfo[];
}

type Selection =
  | { type: 'all' }
  | { type: 'customer'; id: string }
  | { type: 'dealroom'; id: string };

export default function TeamPageLayout({ customers }: Props) {
  const [selection, setSelection] = useState<Selection>({ type: 'all' });
  const [dealRooms, setDealRooms] = useState<DealRoom[]>([]);

  useEffect(() => {
    fetch('/api/deal-rooms')
      .then(r => r.json())
      .then(setDealRooms)
      .catch(() => {});
  }, []);

  const selectedCustomer = selection.type === 'customer'
    ? customers.find(c => c.id === selection.id)
    : undefined;

  const selectedDealRoom = selection.type === 'dealroom'
    ? dealRooms.find(r => r.id === selection.id)
    : undefined;

  return (
    <div className="team-page-layout">
      {/* Sidebar */}
      <div className="team-sidebar">
        <div className="team-sidebar-label">Workspaces</div>
        <button
          className={`team-sidebar-item ${selection.type === 'all' ? 'team-sidebar-active' : ''}`}
          onClick={() => setSelection({ type: 'all' })}
        >
          <div className="team-sidebar-icon">
            <span>All</span>
          </div>
          <span className="team-sidebar-name">All Notes</span>
        </button>

        {/* Deal Rooms */}
        {dealRooms.length > 0 && (
          <>
            <div className="team-sidebar-label" style={{ marginTop: 'var(--space-sm)' }}>Deal Rooms</div>
            {dealRooms.map(room => (
              <button
                key={room.id}
                className={`team-sidebar-item ${selection.type === 'dealroom' && selection.id === room.id ? 'team-sidebar-active' : ''}`}
                onClick={() => setSelection({ type: 'dealroom', id: room.id })}
              >
                <div className="team-sidebar-icon" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                  <span style={{ fontSize: '0.65rem' }}>DR</span>
                </div>
                <span className="team-sidebar-name">{room.name}</span>
                {room.members.length > 0 && (
                  <span className="team-sidebar-count">{room.members.length}</span>
                )}
              </button>
            ))}
          </>
        )}

        <div className="team-sidebar-label" style={{ marginTop: 'var(--space-sm)' }}>People</div>
        {customers.map(customer => (
          <button
            key={customer.id}
            className={`team-sidebar-item ${selection.type === 'customer' && selection.id === customer.id ? 'team-sidebar-active' : ''}`}
            onClick={() => setSelection({ type: 'customer', id: customer.id })}
          >
            {customer.logoUrl ? (
              <img src={`/api/files/${customer.logoUrl}`} alt="" className="team-sidebar-avatar" />
            ) : (
              <div className="team-sidebar-icon">
                <span>{customer.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="team-sidebar-name">{customer.name}</span>
            {customer._count.teamNotes > 0 && (
              <span className="team-sidebar-count">{customer._count.teamNotes}</span>
            )}
          </button>
        ))}

        {customers.length === 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.5rem 0.75rem' }}>
            No people yet
          </p>
        )}
      </div>

      {/* Content */}
      <div className="team-page-content">
        {selection.type === 'dealroom' && selectedDealRoom ? (
          <DealRoomChat key={selectedDealRoom.id} dealRoom={selectedDealRoom} />
        ) : (
          <TeamBoard
            key={selection.type === 'customer' ? selection.id : 'all'}
            customerId={selection.type === 'customer' ? selection.id : undefined}
            customerName={selectedCustomer?.name}
          />
        )}
      </div>
    </div>
  );
}
