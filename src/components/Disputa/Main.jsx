import { CatalogProvider } from './contexts/CatalogContext';
import Precificador from './components/Precificador';

export default function App() {
  return (
    <CatalogProvider>
      <Precificador />
    </CatalogProvider>
  );
}