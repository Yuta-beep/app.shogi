export type DataSourceMode = 'api' | 'local';

function rawDataSource(): string {
  return (process.env.EXPO_PUBLIC_DATA_SOURCE ?? '').trim().toLowerCase();
}

export function getDataSourceMode(): DataSourceMode {
  return rawDataSource() === 'api' ? 'api' : 'local';
}

export function isApiDataSource(): boolean {
  return getDataSourceMode() === 'api';
}
