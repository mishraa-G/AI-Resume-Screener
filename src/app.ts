import express from 'express';
import * as dotenv from 'dotenv';
import router from './routes';

dotenv.config();

const app = express();
app.use(express.json()); // parse JSON bodies

// Serve frontend static files
app.use(express.static('public'));

// Register routes
app.use('/api', router);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke globally!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;
