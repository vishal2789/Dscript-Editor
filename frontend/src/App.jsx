import { Routes, Route } from 'react-router-dom';
import ProjectList from './pages/ProjectList';
import Editor from './pages/Editor';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectList />} />
      <Route path="/editor/:projectId" element={<Editor />} />
    </Routes>
  );
}

export default App;

