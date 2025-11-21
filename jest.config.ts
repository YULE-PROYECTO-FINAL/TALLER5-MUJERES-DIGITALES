// jest.config.ts
import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageDirectory: './coverage', // Saber en qué carpeta se guarda el coverage
  collectCoverageFrom: ['src/**/*.ts'], // Saber qué archivos debe probar
  moduleFileExtensions: ['ts', 'js', 'json'], // Qué archivos debo considerar
  collectCoverage: true, // Directorio donde revisar para evaluar los archivos
  transform: { '^.+\\.(t)s$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1', // Validación para verificar que los imports se hacen desde el directorio src
  },
};

export default config;
