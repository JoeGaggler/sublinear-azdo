import { useState } from 'react'
import './App.css'

function App() {
  const [_count, _setCount] = useState(0)

  return (
    <>
      <p className="read-the-docs">
        Hi!
      </p>
    </>
  )
}

export interface AppSingleton {
}

export interface AppProps {
    bearerToken: string;
    appToken: string;
    singleton: AppSingleton;
}

export default App
