import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import '../styles/SearchResultsDropdown.css';
const SearchResultsDropdown = ({ results, onSelect, defaultAvatar }) => (_jsx("ul", { className: "twitter-dropdown", role: "listbox", children: results.map(user => (_jsxs("li", { role: "option", className: "twitter-item", onClick: () => onSelect(user.id), children: [_jsx("img", { src: user.avatarUrl || defaultAvatar, alt: user.displayName, className: "twitter-avatar" }), _jsxs("div", { className: "twitter-text", children: [_jsx("span", { className: "twitter-name", children: user.displayName }), _jsxs("span", { className: "twitter-username", children: ["@", user.username] })] })] }, user.id))) }));
export default SearchResultsDropdown;
