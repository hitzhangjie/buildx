import { Link } from "react-router-dom";
import { SimpleLayout } from "../layout/SimpleLayout";

export function PageNotFoundPage() {
  return (
    <SimpleLayout
      title="Page Not Found"
      subTitle="I didn't eat it. I swear!"
      icon="/~icon/sad-panda.svg"
    >
      <Link to="/~projects" className="btn btn-primary">
        Back To Home
      </Link>
    </SimpleLayout>
  );
}
