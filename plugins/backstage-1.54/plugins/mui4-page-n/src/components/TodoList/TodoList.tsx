import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

export type TodoItem = {
  title: string;
  id: string;
  createdBy: string;
  createdAt: string;
};

export const TodoList = ({ todos }: { todos: TodoItem[] }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Created by</TableCell>
            <TableCell>Created at</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {todos.map(todo => (
            <TableRow key={todo.id}>
              <TableCell>{todo.title}</TableCell>
              <TableCell>{todo.createdBy}</TableCell>
              <TableCell>{new Date(todo.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
