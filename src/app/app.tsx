import { getClasses } from './styles/get-classes';

export const App = () => {
  const { cnRoot, cnTitle } = getClasses();

  return (
    <main className={cnRoot}>
      <h1 className={cnTitle}>green-chat</h1>
    </main>
  );
};
