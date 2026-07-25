import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import RoundScreen from './screens/RoundScreen';
import DailyScreen from './screens/DailyScreen';
import DuelNewScreen from './screens/DuelNewScreen';
import DuelScreen from './screens/DuelScreen';
import LiveDuelScreen from './screens/LiveDuelScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/play" element={<RoundScreen />} />
        <Route path="/daily" element={<DailyScreen />} />
        <Route path="/live" element={<LiveDuelScreen />} />
        <Route path="/duel/new" element={<DuelNewScreen />} />
        <Route path="/duel/:code" element={<DuelScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
