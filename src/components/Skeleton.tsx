interface SkeletonProps {
  width?: string;
  height?: string;
}

export function Skeleton({ width = "100%", height = "0.875rem" }: SkeletonProps) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonTableRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <tr key={rowIndex} className="data-table__row" aria-hidden="true">
          {Array.from({ length: columns }, (_, columnIndex) => (
            <td key={columnIndex}>
              <Skeleton width={columnIndex === 0 ? "70%" : "45%"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function SkeletonStack({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index}>
          <Skeleton width="35%" height="1rem" />
          <Skeleton width="65%" height="0.75rem" />
        </div>
      ))}
    </div>
  );
}
