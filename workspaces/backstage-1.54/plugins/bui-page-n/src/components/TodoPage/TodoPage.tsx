import { Header, Container } from '@backstage/ui';
import { TodoList } from '../TodoList';
import type { TodoItem } from '../TodoList';

const exampleTodos: TodoItem[] = [
  {
    id: '1',
    title: 'Install the backend plugin',
    createdBy: 'user:default/guest',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Connect the frontend to real data',
    createdBy: 'user:default/guest',
    createdAt: new Date().toISOString(),
  },
];

export const TodoPage = () => {
  return (
    <>
      <Header title="Welcome to bui-page-n!" />
      <Container>
        <TodoList todos={exampleTodos} />
      </Container>
    </>
  );
};
