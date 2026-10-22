const Box = ({ h, w = "100%" }) => <div className="sk" style={{ height: h, width: w }} />;

export default function Loading() {
  return (
    <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Box h={34} w="40%" />
      <div className="dash">
        <div className="col"><Box h={190} /><Box h={300} /></div>
        <div className="col"><Box h={190} /><Box h={300} /></div>
        <div className="col"><Box h={300} /><Box h={190} /></div>
      </div>
    </div>
  );
}
