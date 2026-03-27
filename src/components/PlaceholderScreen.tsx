interface PlaceholderScreenProps {
  title: string;
}

const PlaceholderScreen = ({ title }: PlaceholderScreenProps) => (
  <div className="flex items-center justify-center min-h-[60vh] px-6">
    <h1 className="text-xl font-semibold text-foreground opacity-60">{title}</h1>
  </div>
);

export default PlaceholderScreen;
