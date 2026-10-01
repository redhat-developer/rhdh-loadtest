import { Content, Header } from '@backstage/core-components';
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
      <Header title="Welcome to bcc-page-n!" />
      <Content>
        <TodoList todos={exampleTodos} />
      </Content>
    </>
  );
};
