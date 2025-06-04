import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Outlet } from "react-router-dom";
import Navbar from "../components/NavbarMain";
const Layout = () => {
    return (_jsxs(_Fragment, { children: [_jsx(Navbar, {}), _jsxs("div", { className: "main-content", children: [_jsx(Outlet, {}), " "] })] }));
};
export default Layout;
