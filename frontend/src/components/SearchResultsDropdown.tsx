/* SearchResultsDropdown.tsx */
import React from 'react';
import '../styles/SearchResultsDropdown.css';

type Props = {
  results: { id: string; displayName: string; username: string; avatarUrl?: string }[];
  onSelect: (id: string) => void;
  defaultAvatar: string;
};

const SearchResultsDropdown: React.FC<Props> = ({ results, onSelect, defaultAvatar }) => (
  <ul className="twitter-dropdown" role="listbox">
    {results.map(user => (
      <li
        key={user.id}
        role="option"
        className="twitter-item"
        onClick={() => onSelect(user.id)}
      >
        <img
          src={user.avatarUrl || defaultAvatar}
          alt={user.displayName}
          className="twitter-avatar"
        />
        <div className="twitter-text">
          <span className="twitter-name">{user.displayName}</span>
          <span className="twitter-username">@{user.username}</span>
        </div>
      </li>
    ))}
  </ul>
);

export default SearchResultsDropdown;