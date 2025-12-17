import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
    }
};
