import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./Components/Home";
import User from "./Components/User";
import Create from "./Components/Create";
import Admin from "./Components/Admin";
import Authorizer from "./Components/Authorizer";
import LivingDonor from "./Components/LivingDonor";
import Error from "./Helper/Error";
import "./App.css";

function App() {
    return (
        <div>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />}></Route>
                    <Route path="/User" element={<User />}></Route>
                    <Route path="/Create" element={<Create />}></Route>
                    <Route path="/Authorizer" element={<Authorizer />}></Route>
                    <Route path="/LivingDonor" element={<LivingDonor />}></Route>
                    <Route path="/Admin" element={<Admin />}></Route>
                    <Route path="/Error" element={<Error />}></Route>
                </Routes>
            </BrowserRouter>
        </div>
    )
}

export default App;