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

export const addUserToProject = async ({ users, projectId, userId }) => {

    if (!projectId) {
        throw new Error('Project ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid Project ID');
    }

    if(!users) {
        throw new Error('Users is required');
    }

    if (!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error('Invalid User ID(s) in users array');
    }

    if(!userId) {
        throw new Error('User is required');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid User ID');
    }

    const project = await projectModel.findOne({ _id: projectId, users: userId });

    if (!project) {
        throw new Error('User not belong to this project');
    }

    const updatedProject = await projectModel.findByIdAndUpdate({
        _id: projectId
    }, {
        $addToSet: { users: { $each: users } }
    }, {
        new: true
    })

    return updatedProject;
}

export const getProjectById = async ({ projectId }) => {
    if (!projectId) {
        throw new Error('Project ID is required');
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid Project ID');
    }

    const project = await projectModel.findOne({
        _id: projectId
    }).populate('users');

    if (!project) {
        throw new Error('Project not found');
    }

    return project;
}