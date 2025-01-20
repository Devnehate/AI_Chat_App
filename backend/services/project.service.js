import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';


export const createProject = async ({
    name, userId
}) => {
    if (!name) {
        throw new Error('Name is required');
    }

    if (!userId) {
        throw new Error('User is required');
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [userId]
        });
        project = await projectModel.findById(project._id).populate('users');
    } catch (error) {
        if (error.code === 11000) { 
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;
}

export const getAllProjectsbByUserId = async ({ userId }) => {
    if(!userId) {
        throw new Error('User is required');
    }

    const allUserProjects = await projectModel.find({ users: userId }).populate('users');

    return  allUserProjects;
}