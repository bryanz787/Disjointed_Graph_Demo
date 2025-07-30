import './App.css';
import DisjointNodeGraph from './Visualization/DisjointNodeGraph';

function App() {
  return (
    <div className="App">
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <DisjointNodeGraph />
      </div>
    </div>
  );
}

export default App;
