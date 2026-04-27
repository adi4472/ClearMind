import express from 'express';

const app = express();
app.use(express.json());

app.post('/analyze-thought', async (req, res) => {
  const { text } = req.body;
  // TODO: call Gemini here
  res.json({
    summary: 'You seem mentally overloaded.',
    pattern: 'Task switching and overwhelm',
    next_step: 'Choose one task and focus on it for 15 minutes.',
    tool: 'focus_timer',
  });
});

app.get('/history', async (_req, res) => {
  res.json([
    {
      id: '1',
      summary: 'You felt scattered because too many priorities were competing.',
      pattern: 'Overwhelm',
      next_step: 'Define one task for the next 15 minutes.',
      tool: 'focus_timer',
      created_at: new Date().toISOString(),
    },
  ]);
});

app.listen(1234, () => {
  console.log('Server running on port 1234');
});
