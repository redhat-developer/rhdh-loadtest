import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
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
    <Container maxWidth={false}>
      <Typography variant="h2" component="h2">
        Welcome to mui4-page-n!
      </Typography>
      <TodoList todos={exampleTodos} />
    </Container>
  );
};
