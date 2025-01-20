import { Route, BrowserRouter, Routes } from "react-router-dom";
import Login from "../screens/Login";
import Register from "../screens/Register";
import Home from "../screens/Home";
const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home/>} />
                <Route path="/register" element={<Register/>} />
                <Route path="/login" element={<Login/>} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes