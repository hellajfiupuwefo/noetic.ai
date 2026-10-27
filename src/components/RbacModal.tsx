import React, { useState } from 'react';
import { DeckRole, DeckMember } from '../types';
import { 
  ShieldCheck, 
  X, 
  Users, 
  Check, 
  UserPlus, 
  Lock, 
  Eye, 
  Edit3, 
  Crown, 
  Trash2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface RbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: DeckRole;
  onRoleChange: (newRole: DeckRole) => void;
  deckTitle: string;
}

export const RbacModal: React.FC<RbacModalProps> = ({
  isOpen,
  onClose,
  currentRole,
  onRoleChange,
  deckTitle
}) => {
  if (!isOpen) return null;

  const [members, setMembers] = useState<DeckMember[]>([
    {
      id: 'mem-1',
      name: 'You (Active Session)',
      email: 'student@university.edu',
      role: currentRole,
      avatar: 'YS',
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 7
    },
    {
      id: 'mem-2',
      name: 'Prof. Miller',
      email: 'miller.faculty@stanford.edu',
      role: 'Collaborator',
      avatar: 'PM',
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 3
    },
    {
      id: 'mem-3',
      name: 'Bio-402 Study Group',
      email: 'studygroup-bio402@lists.edu',
      role: 'Viewer',
      avatar: 'BG',
      addedAt: Date.now() - 1000 * 60 * 60 * 24 * 1
    }
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Collaborator' | 'Viewer'>('Collaborator');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSimulateRoleSwitch = (newRole: DeckRole) => {
    onRoleChange(newRole);
    setMembers(prev => prev.map(m => m.id === 'mem-1' ? { ...m, role: newRole } : m));
    setSuccessToast(`Switched active perspective to ${newRole}`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember: DeckMember = {
      id: `mem-${Date.now()}`,
      name: inviteName.trim() || inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      avatar: inviteRole === 'Collaborator' ? 'CL' : 'VW',
      addedAt: Date.now()
    };

    setMembers([...members, newMember]);
    setInviteEmail('');
    setInviteName('');
    setSuccessToast(`Invited ${newMember.name} as ${inviteRole}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleRemoveMember = (id: string) => {
    if (id === 'mem-1') return; // Cannot remove self
    setMembers(members.filter(m => m.id !== id));
  };

  const roleDefinitions = [
    {
      role: 'Owner' as DeckRole,
      title: 'Deck Owner (Administrator)',
      icon: <Crown className="w-4 h-4 text-amber-500" />,
      badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      desc: 'Full administrative ownership. Can edit notes, add/remove attachments, generate quizzes, invite members, modify roles, and delete the deck.'
    },
    {
      role: 'Collaborator' as DeckRole,
      title: 'Collaborator (Editor)',
      icon: <Edit3 className="w-4 h-4 text-indigo-500" />,
      badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      desc: 'Can edit study notes, add/modify flashcards, contribute questions, and participate in real-time syncing. Cannot alter permissions or delete the deck.'
    },
    {
      role: 'Viewer' as DeckRole,
      title: 'Viewer (Read-Only Study)',
      icon: <Eye className="w-4 h-4 text-emerald-500" />,
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      desc: 'Read-only study access. Can practice flashcards, take quizzes, view executive study guides, and export PDFs. Cannot modify deck contents or notes.'
    }
  ];

  const permissionsMatrix = [
    { action: 'Take Quizzes & Practice Flashcards', owner: true, collab: true, viewer: true },
    { action: 'Export Study Guides & Printable PDFs', owner: true, collab: true, viewer: true },
    { action: 'Edit Study Notes & Add Cards', owner: true, collab: true, viewer: false },
    { action: 'Upload & Remove Attachments', owner: true, collab: true, viewer: false },
    { action: 'Generate AI Materials from Files', owner: true, collab: true, viewer: false },
    { action: 'Invite Members & Manage RBAC Roles', owner: true, collab: false, viewer: false },
    { action: 'Delete Deck & Transfer Ownership', owner: true, collab: false, viewer: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl rounded-2xl theme-bg-surface theme-border border shadow-2xl overflow-hidden animate-scaleIn transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between theme-bg-elevated/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold theme-text-primary">
                  Role-Based Access Control (RBAC)
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                  {currentRole} Access
                </span>
              </div>
              <p className="text-xs theme-text-secondary">
                Explicit deck governance for "{deckTitle || 'Current Study Deck'}"
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg theme-text-muted hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Success Toast */}
          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Interactive Role Simulator */}
          <div className="p-4 rounded-xl theme-bg-elevated theme-border border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Simulate Perspective / Test Active Role
              </span>
              <span className="text-[10px] theme-text-muted">
                Click any role to test interface permissions
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['Owner', 'Collaborator', 'Viewer'] as DeckRole[]).map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleSimulateRoleSwitch(role)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    currentRole === role
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-semibold'
                      : 'theme-bg-surface theme-border hover:theme-bg-hover theme-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{role}</span>
                    {currentRole === role && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`text-[10px] leading-tight ${currentRole === role ? 'text-indigo-100' : 'theme-text-muted'}`}>
                    {role === 'Owner' ? 'Full Admin' : role === 'Collaborator' ? 'Editor' : 'Study Only'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Role Definitions */}
          <div className="space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-muted">
              Role Definitions &amp; Boundaries
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {roleDefinitions.map(def => (
                <div 
                  key={def.role}
                  className="p-3.5 rounded-xl theme-bg-elevated theme-border border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {def.icon}
                      <span className="text-xs font-bold theme-text-primary">
                        {def.title}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${def.badgeClass}`}>
                      {def.role}
                    </span>
                  </div>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {def.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions Matrix Table */}
          <div className="space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-muted">
              Permissions Matrix
            </span>
            <div className="rounded-xl theme-border border overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="theme-bg-elevated border-b theme-border font-semibold theme-text-primary">
                  <tr>
                    <th className="p-3">Capability</th>
                    <th className="p-3 text-center">Owner</th>
                    <th className="p-3 text-center">Collaborator</th>
                    <th className="p-3 text-center">Viewer</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border theme-text-secondary">
                  {permissionsMatrix.map((row, idx) => (
                    <tr key={idx} className="hover:theme-bg-hover transition-colors">
                      <td className="p-3 font-medium theme-text-primary">{row.action}</td>
                      <td className="p-3 text-center">
                        {row.owner ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.collab ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                      </td>
                      <td className="p-3 text-center">
                        {row.viewer ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : <X className="w-4 h-4 text-rose-500 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Members & Invite Section */}
          <div className="space-y-3">
            <span className="block text-xs font-bold uppercase tracking-wider theme-text-muted">
              Deck Members ({members.length})
            </span>

            <div className="space-y-2">
              {members.map(member => (
                <div 
                  key={member.id}
                  className="p-3 rounded-xl theme-bg-elevated theme-border border flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 font-bold text-xs flex items-center justify-center shrink-0">
                      {member.avatar || member.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold theme-text-primary flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.id === 'mem-1' && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">You</span>
                        )}
                      </div>
                      <div className="text-[11px] theme-text-muted font-mono">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      member.role === 'Owner' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : member.role === 'Collaborator'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {member.role}
                    </span>

                    {member.id !== 'mem-1' && currentRole === 'Owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove member access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite Form (Owner Only) */}
            {currentRole === 'Owner' && (
              <form onSubmit={handleInvite} className="p-3 rounded-xl theme-bg-surface theme-border border space-y-2.5 mt-3">
                <span className="text-xs font-semibold theme-text-primary block">
                  Invite New Member
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@university.edu"
                    className="theme-bg-input theme-border border rounded-xl px-3 py-1.5 text-xs theme-text-primary focus:outline-none focus:border-indigo-500 sm:col-span-1"
                    required
                  />

                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Name (Optional)"
                    className="theme-bg-input theme-border border rounded-xl px-3 py-1.5 text-xs theme-text-primary focus:outline-none focus:border-indigo-500 sm:col-span-1"
                  />

                  <div className="flex items-center gap-1.5 sm:col-span-1">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="theme-bg-input theme-border border rounded-xl px-2 py-1.5 text-xs theme-text-primary focus:outline-none focus:border-indigo-500 flex-1 cursor-pointer"
                    >
                      <option value="Collaborator">Collaborator</option>
                      <option value="Viewer">Viewer</option>
                    </select>

                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                    >
                      Invite
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t theme-border theme-bg-elevated/40 flex items-center justify-between text-xs">
          <span className="theme-text-muted">
            Role changes apply immediately to this active session
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
