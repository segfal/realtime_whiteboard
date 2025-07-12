import { Canvas } from './components/Canvas'
import './App.css'

const App: React.FC = () => {
  return (
    <div className="App">
      <h1>Whiteboard</h1>
      <Canvas width={800} height={600} />
    </div>
  )
}

export default App