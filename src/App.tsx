import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { HomePage } from '@/pages/HomePage';
import { PracticePage } from '@/pages/PracticePage';
import { ExamPage } from '@/pages/ExamPage';
import { StatisticsPage } from '@/pages/StatisticsPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/practice/:module" element={<PracticePage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
