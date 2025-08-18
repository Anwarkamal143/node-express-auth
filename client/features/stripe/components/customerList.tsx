import ButtonLoader from "@/components/ButtonLoader";
import { Loader } from "@/components/loaders";
import { useListCustomers } from "../api/useCustomerList";

const CustomerList = () => {
  const { data, isLoading, isFetching, error, fetchNextPage } =
    useListCustomers();

  // if (isLoading) return <div>Loading customers...</div>;
  console.log(data, "customers list");
  if (error) return <div className="text-red-500">{error?.data?.message}</div>;

  return (
    <div>
      <div className="overflow-x-auto pt-6 px-2">
        {!isLoading ? (
          <table className="min-w-full divide-y divide-gray-600">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-200 uppercase tracking-wider">
                  Phone
                </th>
              </tr>
            </thead>
            <tbody className=" divide-y divide-gray-600">
              {data?.pages?.map((page) => {
                const customers = page?.data;
                return customers?.map((customer) => {
                  console.log(customer, "customer");
                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-b-gray-600"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {customer.phone}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        ) : null}
        {data?.pagination_meta?.hasMore ? (
          <ButtonLoader
            onClick={() => fetchNextPage()}
            className="ml-auto mt-2"
            variant={"secondary"}
          >
            Fetch Next
          </ButtonLoader>
        ) : null}
      </div>
      {isFetching ? <Loader full className="pt-2" /> : null}
    </div>
  );
};

export default CustomerList;
