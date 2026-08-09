export interface AvatarProps {
  name: string;
  size?: number;
  status?: 'online' | 'offline' | 'busy';
}