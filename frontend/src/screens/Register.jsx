import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios.js';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();

    function handleSubmit(e) {
        e.preventDefault()
        axios.post('/users/register', {
            email,
            password
        }).then((res) => {
            console.log(res.data);
            localStorage.setItem('token', res.data.token);
            setUser(res.data.user);
            navigate('/');
        }).catch((err) => {
            console.log(err.response.data);
        }
        )
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full p-2 border border-gray-700 rounded bg-gray-700 text-white"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full p-2 border border-gray-700 rounded bg-gray-700 text-white"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
                    >
                        Register
                    </button>
                </form>
                <p className="mt-4 text-center">
                    Already have an account? <Link to="/login" className="text-blue-500 hover:underline">login here</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;