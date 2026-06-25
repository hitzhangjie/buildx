-- BuildDependence: records that one build depends on another.
-- Maps to OneDev o_BuildDependence table.
CREATE TABLE IF NOT EXISTS o_BuildDependence (
    o_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    o_dependent_id         INTEGER NOT NULL,
    o_dependency_id        INTEGER NOT NULL,
    o_requireSuccessful    INTEGER NOT NULL DEFAULT 0,
    o_artifacts            VARCHAR(1000),
    o_destinationPath      VARCHAR(500),
    FOREIGN KEY (o_dependent_id)  REFERENCES o_Build(o_id) ON DELETE CASCADE,
    FOREIGN KEY (o_dependency_id) REFERENCES o_Build(o_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_BuildDependence_dependent_dependency
    ON o_BuildDependence(o_dependent_id, o_dependency_id);
CREATE INDEX IF NOT EXISTS idx_BuildDependence_dependent
    ON o_BuildDependence(o_dependent_id);
CREATE INDEX IF NOT EXISTS idx_BuildDependence_dependency
    ON o_BuildDependence(o_dependency_id);
