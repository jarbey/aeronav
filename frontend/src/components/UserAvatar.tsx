import React from 'react';
import type { User } from '../types';
import { userInitials } from '../data/mockData';

interface UserAvatarProps {
  user: User;
  size?: number;
  title?: string;
}

export function UserAvatar({ user, size = 24, title }: UserAvatarProps) {
  const colorIdx = (user.id.charCodeAt(1) % 6) + 1;
  return (
    <span
      title={title || `${user.first} ${user.last}`}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `var(--plane-${colorIdx})`, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: Math.round(size * 0.42),
        flexShrink: 0,
      }}
    >
      {userInitials(user)}
    </span>
  );
}
