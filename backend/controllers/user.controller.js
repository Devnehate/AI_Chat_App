import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';

export const createUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await userService.createUser(req.body);

        const token = user.generateJWT();

        delete user._doc.password;

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            throw new Error('Invalid login credentials');
        }

        const isValidPassword = await user.isValidPassword(password);

        if (!isValidPassword) {
            throw new Error('Invalid login credentials');
        }

        const token = user.generateJWT();

        delete user._doc.password;

        res.status(200).json({ user, token });

    }
    catch (error) {
        res.status(400).send(error.message);
    }
}

export const profileController = async (req, res) => {
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];

        if (!token) {
            throw new Error('Please authenticate.');
        }

        redisClient.set(token, 'logged out');

        res.status(200).send('Logged out successfully');
    } catch (error) {
        res.status(400).send(error.message);
    }
}