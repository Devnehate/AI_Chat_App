import { Route, BrowserRouter, Routes } from "react-router-dom";
import Login from "../screens/Login";
const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<div>Home</div>} />
                <Route path="/register" element={<div>Register</div>} />
                <Route path="/login" element={<Login/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes