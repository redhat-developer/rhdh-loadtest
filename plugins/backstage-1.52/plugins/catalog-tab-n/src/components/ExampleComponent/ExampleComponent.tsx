import { Typography, Grid } from '@material-ui/core';
import {
  InfoCard,
} from '@backstage/core-components';
import { ExampleFetchComponent } from '../ExampleFetchComponent';

export const ExampleComponent = () => (
  <Grid container spacing={3} direction="column">
    <Grid item>
      <InfoCard title="Catalog Tab N">
        <Typography variant="body1">
          All content should be wrapped in a card like this.
        </Typography>
      </InfoCard>
    </Grid>
    <Grid item>
      <ExampleFetchComponent />
    </Grid>
  </Grid>
);
